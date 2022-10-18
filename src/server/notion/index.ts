/*
 * @Author: Nicodemus nicodemusdu@gmail.com
 * @Date: 2022-10-10 17:40:07
 * @LastEditors: Nicodemus nicodemusdu@gmail.com
 * @LastEditTime: 2022-10-18 17:16:48
 * @FilePath: /notion-statistics-bot-backend/src/server/notion/index.ts
 * @Description:
 *
 * Copyright (c) 2022 by Nicodemus nicodemusdu@gmail.com, All Rights Reserved.
 */
import { Client } from '@notionhq/client';
import { Logger } from 'tsrpc';
import {
    createConfigurationDatabase,
    initConfigurationDatabase,
    getConfigurationItemValue,
    updateConfigurationItemValue,
} from './configuration';
import {
    searchDatabase,
    idToString,
    getDatabaseAllPages,
    getDatabaseProperties,
    getUUID,
    isValidUUID,
    pageResponseToPersonList,
    pageResponseStartDateToISOString,
    pageResponseFormulaToNumber,
    isExistTitleInRecordDatabase,
    pageResponseToRichTextList,
} from './utils';
import { EDatabaseName, EConfigurationItem, IProjectConfiguration, IBaseType, EPropertyType } from './types';
import { UserError } from './error';
import {
    insertResultDatabaseItem,
    increaseResultDatabaseItem,
    createResultDatabase,
    createAutofillPropertyInStatisticsSource,
} from './statistics';
import { createRecordDatabase, insertRecordDatabaseItem } from './record';

import { recordDatabaseModelData as recordData } from './data';

import dotenv from 'dotenv';
import { PageObjectResponse, PersonUserObjectResponse } from '@notionhq/client/build/src/api-endpoints';
dotenv.config();

// 调试信息的输出方式
export let logger: Logger;

export const notionClient = getNotionClient(process.env.NOTION_API_KEY as string);
// 整个软件数据库的父页Id
const parentPageId = process.env.NOTION_PARENT_PAGE_ID ?? '';
// 软件配置列表
const projectDBConfig: IProjectConfiguration = {
    ConfigurationDatabaseId: '',
    StatisticsResultDBId: '',
    InformationSourceRecordDBId: '',
    TranslationRecordDBId: '',
    ProofeadRecordDBId: '',
    BountyRecordDBId: '',
    StatisticsContributionDBIdList: [],
    StatisticsBountyDBIdList: [],
};
// 软件统计字段, key: 程序中的字段变量名, value: 数据库存储的字段名称
const statisticFiledNameConfigMap = new Map<string, string>();

/**
 * @description: 记录每个要统计的数据库中,统计字段的属性Id,便于查询属性值
 *  Map<key = 数据库Id, Value = Map<属性名, 属性在当前数据库中的[id, type, name]>>
 * @return {*}
 */
const statisticPropertyIdMap = new Map<string, Map<string, IBaseType>>();

export function getNotionClient(apiKey: string) {
    return new Client({ auth: apiKey });
}

/**
 * @description:
 * @param {Client} notion
 * @param {string} parentPageId 存放Configuration数据库的页面,也是存放其他统计结果的页面
 * @return {*}
 */
async function getOrCreateConfigurationDB(notion: Client, parentPageId: string) {
    // 读取父页中Configuration数据库
    const configDB = await searchDatabase(notion, EDatabaseName.ConfigDBName);

    // 配置数据库Id
    let configurationId: string | undefined;

    // 如果存在配置数据库,就直接读取;
    if (configDB?.length) {
        configurationId = configDB[0].id;
    } else {
        // 如果配置数据库不存在,先创建,然后初始化
        configurationId = await createConfigurationDatabase(notion, parentPageId);
        await initConfigurationDatabase(notion, configurationId);
    }
    return configurationId;
}

/**
 * @description: 从configurationDBId数据库读取存储统计结果的数据库ID,如果当前不存在这个数据库,就创建一个.
 * @param {Client} notion
 * @param {string} configurationDBId
 * @return {*}
 */
async function getOrCreateStatisticsResultDB(notion: Client, configurationDBId: string) {
    // 在配置数据库中查找Result统计结果数据库的id
    let resultId = await getConfigurationItemValue(notionClient, configurationDBId, EConfigurationItem.Auto_ResultDBId);

    // 如果当前configuration数据库中不存在resultId,就去创建一个
    if (!resultId) {
        resultId = await createResultDatabase(notionClient, parentPageId);
        // 把新创建的resultId写入到configuration数据库中
        await updateConfigurationItemValue(
            notionClient,
            configurationDBId,
            EConfigurationItem.Auto_ResultDBId,
            idToString(resultId),
        );
    }
    return resultId;
}

/**
 * @description: 从configurationDBId数据库读取存储贡献度记录的recordDBName数据库Id,如果当前不存在这个数据库,就创建一个.
 * @param {Client} notion
 * @param {string} configurationDBId
 * @param {EConfigurationItem} recordDBName
 * @return {*}
 */
async function getOrCreateRecordDB(
    notion: Client,
    configurationDBId: string,
    configItemName: EConfigurationItem,
    createDBName: EDatabaseName,
) {
    // 在配置数据库中查找Result统计结果数据库的id
    let recordId = await getConfigurationItemValue(notionClient, configurationDBId, configItemName);

    // 如果当前configuration数据库中不存在resultId,就去创建一个
    if (!recordId) {
        recordId = await createRecordDatabase(notionClient, parentPageId, createDBName);
        // 把新创建的resultId写入到configuration数据库中
        await updateConfigurationItemValue(notionClient, configurationDBId, configItemName, idToString(recordId));
    }
    return recordId;
}

/**
 * @description: 从configurationDBId数据库读取用于统计的信息源数据库,如果不存在,就报错提醒.
 * @param {Client} notion
 * @param {string} configurationDBId
 * @param {EConfigurationItem} dbName
 * @return {*}
 */
async function getStatisticsSourceDBIdList(notion: Client, configurationDBId: string, dbName: EConfigurationItem) {
    let sourceListStr = await getConfigurationItemValue(notionClient, configurationDBId, dbName);
    if (sourceListStr) {
        sourceListStr = sourceListStr.replace(/[^a-zA-Z0-9,]/g, '');
        const sourceList = sourceListStr.split(',');
        if (sourceList.length) {
            return sourceList;
        }
    }
    throw new UserError(`getStatisticsSourceDBIdList:\t 读取${dbName}数据库失败. 请提供信息源,否则无法统计`);
}

/**
 * @description:
 * @param {Client} notion
 * @param {string} configurationDBId
 * @param {EConfigurationItem} filedName
 * @param {*} const
 * @param {*} configurationDBId
 * @param {*} filedName
 * @return {*}
 */
async function getFiledNameFromConfigurationDB(
    notion: Client,
    configurationDBId: string,
    filedName: EConfigurationItem,
) {
    const result = await getConfigurationItemValue(notionClient, configurationDBId, filedName);
    if (result) return result;
    throw new UserError(`getFiledNameFromConfigurationDB:\t 读取${filedName}字段失败,请检查数据库`);
}

/**
 * @description: 启动程序后根据.env配置和Configuration来初始化配置信息.
 *  // TODO: 以后要考虑初始化失败定时重新初始化的问题,还有失败后的提示问题.
 * @param {Logger} _logger
 * @return {*}
 */
export async function initNotionStatistics(_logger: Logger) {
    logger = _logger;
    logger.log('initNotionStatistics:\t', 'start');
    // 初始化Configuration
    logger.log('initNotionStatistics:\t', 'init configuration database');
    const configurationId = await getOrCreateConfigurationDB(notionClient, parentPageId);
    logger.log('initNotionStatistics:\t', 'init statistics result database');
    const resultId = await getOrCreateStatisticsResultDB(notionClient, configurationId);
    logger.log('initNotionStatistics:\t', 'init information source record database');
    const sourceRecordId = await getOrCreateRecordDB(
        notionClient,
        configurationId,
        EConfigurationItem.Auto_InformationSourceRecordDBId,
        EDatabaseName.SourceRecordDBName,
    );
    logger.log('initNotionStatistics:\t', 'init translation record database');
    const transRecordId = await getOrCreateRecordDB(
        notionClient,
        configurationId,
        EConfigurationItem.Auto_TranslationRecordDBId,
        EDatabaseName.TranslationRecordDBName,
    );
    logger.log('initNotionStatistics:\t', 'init proofead record database');
    const proofeadRecordId = await getOrCreateRecordDB(
        notionClient,
        configurationId,
        EConfigurationItem.Auto_ProofeadRecordDBId,
        EDatabaseName.ProofeadRecordDBName,
    );
    logger.log('initNotionStatistics:\t', 'init bounty record database');
    const bountyRecordId = await getOrCreateRecordDB(
        notionClient,
        configurationId,
        EConfigurationItem.Auto_BountyRecordDBId,
        EDatabaseName.BountyRecordDBName,
    );
    logger.log('initNotionStatistics:\t', 'init bounty contribution database list');
    const statisticsContributionList = await getStatisticsSourceDBIdList(
        notionClient,
        configurationId,
        EConfigurationItem.StatisticsSource_ContributionDBIdList,
    );
    let statisticsBountyList: string[] = [];
    try {
        logger.log('initNotionStatistics:\t', 'init bounty  database list');
        statisticsBountyList = await getStatisticsSourceDBIdList(
            notionClient,
            configurationId,
            EConfigurationItem.StatisticsSource_BountyDBIdList,
        );
    } catch {
        // TODO:暂时忽略Bounty的缺失,以后再考虑
    }

    projectDBConfig.ConfigurationDatabaseId = configurationId;
    projectDBConfig.StatisticsResultDBId = resultId;
    projectDBConfig.InformationSourceRecordDBId = sourceRecordId;
    projectDBConfig.TranslationRecordDBId = transRecordId;
    projectDBConfig.ProofeadRecordDBId = proofeadRecordId;
    projectDBConfig.BountyRecordDBId = bountyRecordId;
    projectDBConfig.StatisticsContributionDBIdList = statisticsContributionList;
    projectDBConfig.StatisticsBountyDBIdList = statisticsBountyList;

    // 收集要读取的字段列表
    const filedParameterNameList = [
        EConfigurationItem.Filed_InformationSourceFiledName,
        EConfigurationItem.Filed_TranslationFiledName,
        EConfigurationItem.Filed_ProofreadFiledName,
        EConfigurationItem.Filed_TotalPointsFiledName,
        EConfigurationItem.Filed_InformationSourceEndTimeFiledName,
        EConfigurationItem.Filed_TranslationStartTimeFiledName,
        EConfigurationItem.Filed_TranslationEndTimeFiledName,
        EConfigurationItem.Filed_ProofreadStartTimeFiledName,
        EConfigurationItem.Filed_ProofreadonEndTimeFiledName,
        EConfigurationItem.Filed_TaskIdFiledName,
    ];
    // 从数据库读取字段
    await Promise.all(
        filedParameterNameList.map(async (filedName) => {
            // 没有做异常捕获,出错直接报错吧
            logger.log(`initNotionStatistics:\t init ${filedName} Filed Name`);
            const result = await getFiledNameFromConfigurationDB(notionClient, configurationId, filedName);
            statisticFiledNameConfigMap.set(filedName, result);
        }),
    );

    await updateStatisticPropertyIdMap();

    // 同步configuration的字段到统计源数据库,如果统计源缺少哪些数据库,就创建出来
    logger.log(`initNotionStatistics:\t init create autofill properties in statistics`);
    await Promise.all(
        statisticsContributionList.map(async (dbId) => {
            await createAutofillPropertyInStatisticsSource(notionClient, dbId, statisticFiledNameConfigMap);
        }),
    );

    logger.log('initNotionStatistics:\t', 'finished');
}

/**
 * @description: 根据Configuration数据库,更新需要统计的属性Id
 * @return {*}
 */
export async function updateStatisticPropertyIdMap() {
    // 获取所有需要统计的字段名称列表
    const filedNameList = Array.from(statisticFiledNameConfigMap.values());
    await Promise.all(
        // 遍历所有需要统计的数据库
        projectDBConfig.StatisticsContributionDBIdList.map(async (dbId) => {
            const property2IdMap = new Map<string, IBaseType>();
            // 获取数据库中所有属性
            const property = await getDatabaseProperties(notionClient, dbId);
            // 遍历所有属性, 记录下需要统计的属性的id
            property.map((obj) => {
                if (!filedNameList.includes(obj.name)) {
                    // TODO: 马上改!!!!!!!如果没有这个字段, 需要创建出来;
                }
                property2IdMap.set(obj.name, { id: obj.id, type: obj.type as EPropertyType, name: obj.name });
            });
            statisticPropertyIdMap.set(dbId, property2IdMap);
        }),
    );
    return statisticPropertyIdMap;
}

// TODO: 注意转换时区
// export async function doOnceForAllTimesStatistics() {}
// export async function doOnceForTimerangeStatistics() {}

export async function testNotion() {
    let timeRange;
    /**
     * 统计步骤:
     * 1. 筛选记录范围, 暂略
     * 2. 读取数据库中每一页id
     * 3. 读取每一页的属性值, 如果这一页不存在TaskId属性,就创建一个并且初始化成uuid.v3()
     * 4. 使用读取的属性之,创建一条或者多条Record
     * 5. 数据库中每一页属性全部记录完成后,开始统计结果
     *
     *
     * 6. 筛选统计范围, 暂略
     * 7. 在内存中创建贡献者列表, 读取所有record数据库, 把贡献信息记录到对应的贡献者身上
     * 8. 把内存中的统计结果更新到数据库中
     */

    logger.log(statisticFiledNameConfigMap);
    // 常用类型: rich_text, title, date, number, [person], formula, 把常用类型判断做成utils工具吧;

    const recordToDatabase = async ({
        page,
        statisticsDBId,
        taskId,
        contributorFiledName,
        startTimeFiledName,
        endTimeFiledName,
        pointsFiledName,
        recordDBId,
    }: {
        page: PageObjectResponse;
        statisticsDBId: string;
        taskId: string;
        contributorFiledName: string;
        startTimeFiledName: string;
        endTimeFiledName: string;
        pointsFiledName: string;
        recordDBId: string;
    }) => {
        // 完成时间
        const endTime = pageResponseStartDateToISOString(page, endTimeFiledName);
        if (!endTime) throw new UserError(`请填写 ${taskId} 任务的 ${endTimeFiledName}`);
        // 贡献者
        const contributorList = pageResponseToPersonList(page, contributorFiledName);
        if (!contributorList.length) throw new UserError(`请填写 ${taskId} 任务的 ${contributorFiledName}`);
        // 积分
        const points = pageResponseFormulaToNumber(page, pointsFiledName);
        if (!points) throw new UserError(`请填写 ${taskId} 任务的 ${pointsFiledName}`);
        // 开始时间
        const startTime = pageResponseStartDateToISOString(page, startTimeFiledName);
        if (!startTime) throw new UserError(`请填写 ${taskId} 任务的 ${startTimeFiledName}`);

        // 记录信息到数据库
        await insertRecordDatabaseItem(
            notionClient,
            recordDBId,
            taskId,
            statisticsDBId,
            contributorList[0],
            points,
            startTime,
            endTime,
        );
    };

    await statisticPropertyIdMap.forEach(async (propertyIdMap, statisticsDBId) => {
        const pages = await getDatabaseAllPages(notionClient, statisticsDBId);

        // // 找到统计源中需要统计的属性
        await Promise.all(
            pages.map(async (page) => {
                let taskId: string;
                const taskIdName =
                    statisticFiledNameConfigMap.get(EConfigurationItem.Filed_TaskIdFiledName) || 'TaskId';
                const taskIdList = pageResponseToRichTextList(page, taskIdName);
                // 如果taskId的值不存在或者是无效的uuid
                if (taskIdList) {
                    // 生成一个uuid并且更新数据库
                    if (taskIdList.length && isValidUUID(taskIdList[0])) {
                        taskId = taskIdList[0];
                    } else {
                        taskId = getUUID();
                        notionClient.pages.update({
                            page_id: page.id,
                            properties: {
                                [taskIdName]: {
                                    rich_text: [{ text: { content: taskId } }],
                                },
                            },
                        });
                        // logger.log('taskId:\t', page.properties[taskIdName]);
                    }
                } else {
                    throw new UserError(`统计源数据库 ${statisticsDBId} 中, ${taskIdName}属性不存在`);
                }
                // 信源贡献记录
                if (
                    await isExistTitleInRecordDatabase(
                        notionClient,
                        projectDBConfig.InformationSourceRecordDBId,
                        taskId,
                        recordData.TaskId.name,
                    )
                ) {
                    logger.log(`${taskId} 在数据库 ${projectDBConfig.InformationSourceRecordDBId}中已经有记录了`);
                } else {
                    try {
                        await recordToDatabase({
                            page,
                            statisticsDBId,
                            taskId,
                            contributorFiledName:
                                statisticFiledNameConfigMap.get(EConfigurationItem.Filed_InformationSourceFiledName) ||
                                '信源',
                            startTimeFiledName:
                                statisticFiledNameConfigMap.get(
                                    EConfigurationItem.Filed_InformationSourceEndTimeFiledName,
                                ) || '信源完成时间',
                            endTimeFiledName:
                                statisticFiledNameConfigMap.get(
                                    EConfigurationItem.Filed_InformationSourceEndTimeFiledName,
                                ) || '信源完成时间',
                            pointsFiledName:
                                statisticFiledNameConfigMap.get(EConfigurationItem.Filed_TotalPointsFiledName) ||
                                '积分',
                            recordDBId: projectDBConfig.InformationSourceRecordDBId,
                        });
                    } catch (err) {
                        logger.error(err);
                    }
                }
                // 翻译贡献记录
                if (
                    await isExistTitleInRecordDatabase(
                        notionClient,
                        projectDBConfig.TranslationRecordDBId,
                        taskId,
                        recordData.TaskId.name,
                    )
                ) {
                    logger.log(`${taskId} 在数据库 ${projectDBConfig.TranslationRecordDBId}中已经有记录了`);
                } else {
                    try {
                        // 翻译贡献记录
                        await recordToDatabase({
                            page,
                            statisticsDBId,
                            taskId,
                            contributorFiledName:
                                statisticFiledNameConfigMap.get(EConfigurationItem.Filed_TranslationFiledName) ||
                                '翻译',
                            startTimeFiledName:
                                statisticFiledNameConfigMap.get(
                                    EConfigurationItem.Filed_TranslationStartTimeFiledName,
                                ) || '翻译开始时间',
                            endTimeFiledName:
                                statisticFiledNameConfigMap.get(EConfigurationItem.Filed_TranslationEndTimeFiledName) ||
                                '翻译完成时间',
                            pointsFiledName:
                                statisticFiledNameConfigMap.get(EConfigurationItem.Filed_TotalPointsFiledName) ||
                                '积分',
                            recordDBId: projectDBConfig.TranslationRecordDBId,
                        });
                    } catch (err) {
                        logger.error(err);
                    }
                }
                // 校对贡献记录
                if (
                    await isExistTitleInRecordDatabase(
                        notionClient,
                        projectDBConfig.ProofeadRecordDBId,
                        taskId,
                        recordData.TaskId.name,
                    )
                ) {
                    logger.log(`${taskId} 在数据库 ${projectDBConfig.ProofeadRecordDBId}中已经有记录了`);
                } else {
                    try {
                        // 校对贡献记录
                        await recordToDatabase({
                            page,
                            statisticsDBId,
                            taskId,
                            contributorFiledName:
                                statisticFiledNameConfigMap.get(EConfigurationItem.Filed_ProofreadFiledName) || '校对',
                            startTimeFiledName:
                                statisticFiledNameConfigMap.get(EConfigurationItem.Filed_ProofreadStartTimeFiledName) ||
                                '校对开始时间',
                            endTimeFiledName:
                                statisticFiledNameConfigMap.get(EConfigurationItem.Filed_ProofreadonEndTimeFiledName) ||
                                '校对完成时间',
                            pointsFiledName:
                                statisticFiledNameConfigMap.get(EConfigurationItem.Filed_TotalPointsFiledName) ||
                                '积分',
                            recordDBId: projectDBConfig.ProofeadRecordDBId,
                        });
                    } catch (err) {
                        logger.error(err);
                    }
                }
            }),
        );
        logger.log('testNotion record finished');
    });
}
