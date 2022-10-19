/*
 * @Author: Nicodemus nicodemusdu@gmail.com
 * @Date: 2022-10-10 17:40:07
 * @LastEditors: Nicodemus nicodemusdu@gmail.com
 * @LastEditTime: 2022-10-19 22:42:07
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
    pageResponseToNumber,
    pageResponseToPersonList,
    pageResponseStartDateToISOString,
    pageResponseFormulaToNumber,
    isExistTitleInRecordDatabase,
    pageResponseToRichTextList,
    createUUIDForPage,
} from './utils';
import {
    EDatabaseName,
    EConfigurationItem,
    IBaseType,
    EPropertyType,
    IStatisticsResultDatabaseModel,
    EResultItem,
} from './types';
import { UserError } from './error';
import {
    insertResultDatabaseItem,
    increaseResultDatabaseItem,
    createResultDatabase,
    createAutofillPropertyInStatisticsSource,
} from './statistics';
import { createRecordDatabase, insertRecordDatabaseItem, getRecordDBNotCompletedPages } from './record';

import { recordDatabaseModelData as recordData, resultDatabaseModelData as resultData } from './data';

import dotenv from 'dotenv';
import { PageObjectResponse, PersonUserObjectResponse } from '@notionhq/client/build/src/api-endpoints';
import { info } from 'console';
dotenv.config();

// 调试信息的输出方式
export let logger: Logger;

export const notionClient = getNotionClient(process.env.NOTION_API_KEY as string);
// 整个软件数据库的父页Id
const parentPageId = process.env.NOTION_PARENT_PAGE_ID ?? '';
// 软件配置列表, 存放一个用户(项目, 就是一套工作流程包含的全部配置, 一般指一个Notion Workspace)
interface IProjectConfiguration {
    // 这个是从parent page根据Configuration数据库名称读取的
    ConfigurationDatabaseId: string;
    // 统计结果展示数据库ID
    StatisticsResultDBId: string;
    // 各项占总积分的百分比0 ~ 100
    InformationSourcePointRatio: number;
    TranslationPointRatio: number;
    ProofeadPointRatio: number;
    // 每一项统计保存的数据库, 是用于统计的数据源
    InformationSourceRecordDBId: string;
    TranslationRecordDBId: string;
    ProofeadRecordDBId: string;
    BountyRecordDBId: string;
    // 统计来源: StatisticsContribution 贡献度统计源, 统计文章翻译; StatisticsBounty 赏金统计源,统计赏金任务
    StatisticsContributionDBIdList: string[];
    StatisticsBountyDBIdList: string[];
    // 软件统计字段, key: 程序中的字段变量名 EConfigurationItem.Filed_xxx, value: 数据库存储的字段名称
    statisticFiledNameConfigMap: Map<string, string>;
}

const projectDBConfig: IProjectConfiguration = {
    ConfigurationDatabaseId: '',

    StatisticsResultDBId: '',

    InformationSourcePointRatio: 0,
    TranslationPointRatio: 0,
    ProofeadPointRatio: 0,

    InformationSourceRecordDBId: '',
    TranslationRecordDBId: '',
    ProofeadRecordDBId: '',
    BountyRecordDBId: '',

    StatisticsContributionDBIdList: [],
    StatisticsBountyDBIdList: [],
    statisticFiledNameConfigMap: new Map<string, string>(),
};

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

    // 读取各项占总积分的百分比
    const infoRatio = await getConfigurationItemValue(
        notionClient,
        configurationId,
        EConfigurationItem.PointRatio_InformationSource,
    );
    const transRatio = await getConfigurationItemValue(
        notionClient,
        configurationId,
        EConfigurationItem.PointRatio_TranslationPointRatio,
    );
    const proofeadRatio = await getConfigurationItemValue(
        notionClient,
        configurationId,
        EConfigurationItem.PointRatio_ProofreadRatio,
    );

    if (infoRatio && transRatio && proofeadRatio) {
        projectDBConfig.InformationSourcePointRatio = parseInt(infoRatio);
        projectDBConfig.TranslationPointRatio = parseInt(transRatio);
        projectDBConfig.ProofeadPointRatio = parseInt(proofeadRatio);
    } else {
        throw new UserError(`请在Configuration数据库中填写积分分配比例, 否则无法正常统计`);
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
            projectDBConfig.statisticFiledNameConfigMap.set(filedName, result);
        }),
    );

    await updateStatisticPropertyIdMap();

    // 同步configuration的字段到统计源数据库,如果统计源缺少哪些数据库,就创建出来
    logger.log(`initNotionStatistics:\t init create autofill properties in statistics`);
    await Promise.all(
        statisticsContributionList.map(async (dbId) => {
            await createAutofillPropertyInStatisticsSource(
                notionClient,
                dbId,
                projectDBConfig.statisticFiledNameConfigMap,
            );
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
    const filedNameList = Array.from(projectDBConfig.statisticFiledNameConfigMap.values());
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

/**
 * @description: 从统计源数据库读取的一页提取出Record信息,记录到对应的Record数据库中
 * @param {object}
 * @return {*}
 */
export async function saveToRecordDBFromPageObject({
    page,
    statisticsDBId,
    taskId,
    contributorFiledName,
    startTimeFiledName,
    endTimeFiledName,
    pointsFiledName,
    pointsRatio,
    recordDBId,
}: {
    page: PageObjectResponse;
    statisticsDBId: string;
    taskId: string;
    contributorFiledName: string;
    startTimeFiledName: string;
    endTimeFiledName: string;
    pointsFiledName: string;
    pointsRatio: number;
    recordDBId: string;
}) {
    // 完成时间
    const endTime = pageResponseStartDateToISOString(page, endTimeFiledName);
    if (!endTime) throw new UserError(`请填写 ${taskId} 任务的 ${endTimeFiledName}`);
    // 贡献者
    const contributorList = pageResponseToPersonList(page, contributorFiledName);
    if (!contributorList.length) throw new UserError(`请填写 ${taskId} 任务的 ${contributorFiledName}`);
    // 积分
    const totalPoints = pageResponseFormulaToNumber(page, pointsFiledName);
    if (!totalPoints) throw new UserError(`请填写 ${taskId} 任务的 ${pointsFiledName}`);
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
        (totalPoints * pointsRatio) / 100,
        startTime,
        endTime,
    );
}

export async function doOnceFOrAllTimesRecord(notionClient: Client, projectConfig: IProjectConfiguration) {
    await Promise.all(
        projectConfig.StatisticsContributionDBIdList.map(async (statisticsDBId) => {
            const pages = await getDatabaseAllPages(notionClient, statisticsDBId);

            // // 找到统计源中需要统计的属性
            await Promise.all(
                pages.map(async (page) => {
                    let taskId: string;
                    const taskIdName =
                        projectConfig.statisticFiledNameConfigMap.get(EConfigurationItem.Filed_TaskIdFiledName) ||
                        'TaskId';
                    const taskIdList = pageResponseToRichTextList(page, taskIdName);
                    // 如果taskId的值不存在或者是无效的uuid
                    if (taskIdList) {
                        // 生成一个uuid并且更新数据库
                        if (taskIdList.length && isValidUUID(taskIdList[0])) {
                            taskId = taskIdList[0];
                        } else {
                            taskId = (await createUUIDForPage(page.id, taskIdName)) as string;
                        }
                    } else {
                        throw new UserError(`统计源数据库 ${statisticsDBId} 中, ${taskIdName}属性不存在`);
                    }
                    // 信源贡献记录
                    if (
                        await isExistTitleInRecordDatabase(
                            notionClient,
                            projectConfig.InformationSourceRecordDBId,
                            taskId,
                            recordData.TaskId.name,
                        )
                    ) {
                        logger.log(`${taskId} 在数据库 ${projectConfig.InformationSourceRecordDBId}中已经有记录了`);
                    } else {
                        try {
                            await saveToRecordDBFromPageObject({
                                page,
                                statisticsDBId,
                                taskId,
                                contributorFiledName:
                                    projectConfig.statisticFiledNameConfigMap.get(
                                        EConfigurationItem.Filed_InformationSourceFiledName,
                                    ) || '信源',
                                startTimeFiledName:
                                    projectConfig.statisticFiledNameConfigMap.get(
                                        EConfigurationItem.Filed_InformationSourceEndTimeFiledName,
                                    ) || '信源完成时间',
                                endTimeFiledName:
                                    projectConfig.statisticFiledNameConfigMap.get(
                                        EConfigurationItem.Filed_InformationSourceEndTimeFiledName,
                                    ) || '信源完成时间',
                                pointsFiledName:
                                    projectConfig.statisticFiledNameConfigMap.get(
                                        EConfigurationItem.Filed_TotalPointsFiledName,
                                    ) || '积分',
                                pointsRatio: projectConfig.InformationSourcePointRatio,
                                recordDBId: projectConfig.InformationSourceRecordDBId,
                            });
                        } catch (err) {
                            logger.log(err);
                        }
                    }
                    // 翻译贡献记录
                    if (
                        await isExistTitleInRecordDatabase(
                            notionClient,
                            projectConfig.TranslationRecordDBId,
                            taskId,
                            recordData.TaskId.name,
                        )
                    ) {
                        logger.log(`${taskId} 在数据库 ${projectConfig.TranslationRecordDBId}中已经有记录了`);
                    } else {
                        try {
                            // 翻译贡献记录
                            await saveToRecordDBFromPageObject({
                                page,
                                statisticsDBId,
                                taskId,
                                contributorFiledName:
                                    projectConfig.statisticFiledNameConfigMap.get(
                                        EConfigurationItem.Filed_TranslationFiledName,
                                    ) || '翻译',
                                startTimeFiledName:
                                    projectConfig.statisticFiledNameConfigMap.get(
                                        EConfigurationItem.Filed_TranslationStartTimeFiledName,
                                    ) || '翻译开始时间',
                                endTimeFiledName:
                                    projectConfig.statisticFiledNameConfigMap.get(
                                        EConfigurationItem.Filed_TranslationEndTimeFiledName,
                                    ) || '翻译完成时间',
                                pointsFiledName:
                                    projectConfig.statisticFiledNameConfigMap.get(
                                        EConfigurationItem.Filed_TotalPointsFiledName,
                                    ) || '积分',
                                pointsRatio: projectConfig.TranslationPointRatio,
                                recordDBId: projectConfig.TranslationRecordDBId,
                            });
                        } catch (err) {
                            logger.log(err);
                        }
                    }
                    // 校对贡献记录
                    if (
                        await isExistTitleInRecordDatabase(
                            notionClient,
                            projectConfig.ProofeadRecordDBId,
                            taskId,
                            recordData.TaskId.name,
                        )
                    ) {
                        logger.log(`${taskId} 在数据库 ${projectConfig.ProofeadRecordDBId}中已经有记录了`);
                    } else {
                        try {
                            // 校对贡献记录
                            await saveToRecordDBFromPageObject({
                                page,
                                statisticsDBId,
                                taskId,
                                contributorFiledName:
                                    projectConfig.statisticFiledNameConfigMap.get(
                                        EConfigurationItem.Filed_ProofreadFiledName,
                                    ) || '校对',
                                startTimeFiledName:
                                    projectConfig.statisticFiledNameConfigMap.get(
                                        EConfigurationItem.Filed_ProofreadStartTimeFiledName,
                                    ) || '校对开始时间',
                                endTimeFiledName:
                                    projectConfig.statisticFiledNameConfigMap.get(
                                        EConfigurationItem.Filed_ProofreadonEndTimeFiledName,
                                    ) || '校对完成时间',
                                pointsFiledName:
                                    projectConfig.statisticFiledNameConfigMap.get(
                                        EConfigurationItem.Filed_TotalPointsFiledName,
                                    ) || '积分',
                                pointsRatio: projectConfig.ProofeadPointRatio,
                                recordDBId: projectConfig.ProofeadRecordDBId,
                            });
                        } catch (err) {
                            logger.log(err);
                        }
                    }
                }),
            );
            logger.log('testNotion record finished');
        }),
    );
}

// TODO: 注意转换时区
// export async function doOnceForAllTimesStatistics() {}
// export async function doOnceForTimerangeStatistics() {}

export async function testNotion() {
    let timeRange;
    /**
     * 常用类型: rich_text, title, date, number, [person], formula, 把常用类型判断做成utils工具吧;
     *
     * 统计步骤:
     * 1. 筛选记录范围, 暂略
     * 2. 读取数据库中每一页id
     * 3. 读取每一页的属性值, 如果这一页不存在TaskId属性,就创建一个并且初始化成uuid.v4()
     * 4. 使用读取的属性之,创建一条或者多条Record
     * 5. 数据库中每一页属性全部记录完成后,开始统计结果
     *
     *
     * 6. 筛选统计范围, 暂略
     * 7. 读取所有record数据库中未完成统计的page, 把贡献信息记录到对应的贡献者身上, 并且把page标记为已完成.
     */

    // Record 记录
    await doOnceFOrAllTimesRecord(notionClient, projectDBConfig);

    logger.log('开始统计啦!!!!!!!!!');
    // Statistics 统计
    const st: {
        [contributorId in string]: IStatisticsResultDatabaseModel;
    } = {};
    // 遍历Record
    await Promise.all(
        [
            projectDBConfig.InformationSourceRecordDBId,
            projectDBConfig.TranslationRecordDBId,
            projectDBConfig.ProofeadRecordDBId,
        ].map(async (dbId) => {
            const pages = await getRecordDBNotCompletedPages(notionClient, dbId);
            await Promise.all(
                pages.map(async (page) => {
                    const people = await pageResponseToPersonList(page, recordData.Contributor.name);
                    const infoNum = await pageResponseToNumber(page, recordData.Points.name);
                    if (people.length && infoNum) {
                        const id = people[0].id;
                        // 如果没有当前的索引值, 初始化一个
                        if (!st[id]) {
                            st[id] = JSON.parse(JSON.stringify(resultData)); // 深拷贝
                            logger.log(`${id} is new value:\n`, st[id]);
                        }
                        (st[id].Points.value as number) += infoNum;
                        st[id].ContributorId.value = id;
                        st[id].Contributor.value = people[0];
                        st[id].LastUpdateDate.value = new Date(Date.now()).toISOString();
                        switch (dbId) {
                            case projectDBConfig.InformationSourceRecordDBId:
                                if (st[id].InformationSource.value) {
                                    (st[id].InformationSource.value as number) += 1;
                                } else {
                                    st[id].InformationSource.value = 1;
                                }
                                break;
                            case projectDBConfig.TranslationRecordDBId:
                                if (st[id].Translation.value) {
                                    (st[id].Translation.value as number) += 1;
                                } else {
                                    st[id].Translation.value = 1;
                                }
                                break;
                            case projectDBConfig.ProofeadRecordDBId:
                                if (st[id].Proofead.value) {
                                    (st[id].Proofead.value as number) += 1;
                                } else {
                                    st[id].Proofead.value = 1;
                                }
                                break;
                        }
                    }
                }),
            );
        }),
    );
    logger.log('result:\n', st);
}
