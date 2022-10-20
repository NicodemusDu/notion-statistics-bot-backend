/*
 * @Author: Nicodemus nicodemusdu@gmail.com
 * @Date: 2022-10-12 15:25:08
 * @LastEditors: Nicodemus nicodemusdu@gmail.com
 * @LastEditTime: 2022-10-20 19:20:51
 * @FilePath: /notion-statistics-bot-backend/src/server/notion/statistics.ts
 * @Description: 统计过程的相关操作和统计结果的数据库操作
 *
 * Copyright (c) 2022 by Nicodemus nicodemusdu@gmail.com, All Rights Reserved.
 */
import { Client, isFullPage } from '@notionhq/client';
import { PersonUserObjectResponse } from '@notionhq/client/build/src/api-endpoints';
import { IMember, EPropertyType, EDatabaseName, EConfigurationItem, EStatusType } from './types';
import {
    statisticsResultDatabaseModelData as statisticsData,
    statusResultDatabaseModelData as statusData,
} from './data';
import { Logger } from 'tsrpc';
import { UserError } from './error';
import { getNumberPropertyValue, hasPropertyInDatabase } from './utils';

export async function createStatisticsResultDatabase(notionClient: Client, parentId: string) {
    const newDB = await notionClient.databases.create({
        title: [{ text: { content: EDatabaseName.StatisticsResultDBName } }],
        description: [{ text: { content: '用于存放统计结果' } }],
        parent: { page_id: parentId, type: 'page_id' },
        properties: {
            [statisticsData.ContributorId.name]: {
                type: 'title',
                title: {},
            },
            [statisticsData.Contributor.name]: {
                type: 'people',
                people: {},
            },
            [statisticsData.InformationSource.name]: {
                type: 'number',
                number: { format: 'number' },
            },
            [statisticsData.Translation.name]: {
                type: 'number',
                number: { format: 'number' },
            },
            [statisticsData.Proofead.name]: {
                type: 'number',
                number: { format: 'number' },
            },
            [statisticsData.Bounty.name]: {
                type: 'number',
                number: { format: 'number' },
            },
            [statisticsData.Points.name]: {
                type: 'number',
                number: { format: 'number' },
            },
            [statisticsData.LastUpdateDate.name]: {
                type: 'date',
                date: {},
            },
        },
    });
    return newDB.id;
}

export async function insertStatisticsResultDatabaseItem(
    notionClient: Client,
    resultDBId: string,
    contributor: PersonUserObjectResponse,
    source: number,
    translation: number,
    proofead: number,
    bounty: number,
    points: number,
) {
    await notionClient.pages.create({
        parent: {
            database_id: resultDBId,
        },
        properties: {
            [statisticsData.ContributorId.name]: {
                title: [{ text: { content: contributor.id } }],
            },
            [statisticsData.Contributor.name]: {
                people: [contributor],
            },
            [statisticsData.InformationSource.name]: {
                number: source,
            },
            [statisticsData.Translation.name]: {
                number: translation,
            },
            [statisticsData.Proofead.name]: {
                number: proofead,
            },
            [statisticsData.Bounty.name]: {
                number: bounty,
            },
            [statisticsData.Points.name]: {
                number: points,
            },
            [statisticsData.LastUpdateDate.name]: {
                date: { start: new Date(Date.now()).toISOString() },
            },
        },
    });
    return 'resultPage';
}

/**
 * @description: 在当前数值的基础上增加对应的值, 不变的写入0
 * @return {*}
 */
export async function increaseStatisticsResultDatabaseItem(
    notionClient: Client,
    itemPageId: string,
    contributorId: string,
    source: number,
    translation: number,
    proofead: number,
    bounty: number,
    points: number,
) {
    const current = await notionClient.pages.retrieve({
        page_id: itemPageId,
    });
    if (isFullPage(current)) {
        // 获取当前值
        const currentSource = await getNumberPropertyValue(
            notionClient,
            itemPageId,
            current.properties[statisticsData.InformationSource.name].id,
        );
        const currentTranslation = await getNumberPropertyValue(
            notionClient,
            itemPageId,
            current.properties[statisticsData.Translation.name].id,
        );
        const currentProofead = await getNumberPropertyValue(
            notionClient,
            itemPageId,
            current.properties[statisticsData.Proofead.name].id,
        );
        const currentBoundy = await getNumberPropertyValue(
            notionClient,
            itemPageId,
            current.properties[statisticsData.Bounty.name].id,
        );
        const currentPoints = await getNumberPropertyValue(
            notionClient,
            itemPageId,
            current.properties[statisticsData.Points.name].id,
        );

        if (
            currentSource === null ||
            currentTranslation === null ||
            currentProofead === null ||
            currentBoundy === null ||
            currentPoints === null
        ) {
            throw new UserError(`increaseResultDatabaseItem数据读取错误`);
        }

        // 累积更新
        await notionClient.pages.update({
            page_id: itemPageId,
            properties: {
                [statisticsData.InformationSource.name as string]: {
                    number: source + currentSource,
                },
                [statisticsData.Translation.name as string]: {
                    number: translation + currentTranslation,
                },
                [statisticsData.Proofead.name as string]: {
                    number: proofead + currentProofead,
                },
                [statisticsData.Bounty.name as string]: {
                    number: bounty + currentBoundy,
                },
                [statisticsData.Points.name as string]: {
                    number: points + currentPoints,
                },
                [statisticsData.LastUpdateDate.name as string]: {
                    date: { start: new Date(Date.now()).toISOString() },
                },
            },
        });
    } else {
        throw new UserError(`没有找到当前页${itemPageId}`);
    }

    return 'resultPage';
}

export async function createStatusResultDatabase(notionClient: Client, parentId: string) {
    const newDB = await notionClient.databases.create({
        title: [{ text: { content: EDatabaseName.StatusResultDBName } }],
        description: [{ text: { content: '各种状态下任务数量统计' } }],
        parent: { page_id: parentId, type: 'page_id' },
        properties: {
            [statusData.Status.name]: {
                type: 'title',
                title: {},
            },
            [statusData.Counter.name]: {
                type: 'number',
                number: { format: 'number' },
            },
            [statusData.LastUpdateDate.name]: {
                type: 'date',
                date: {},
            },
        },
    });
    return newDB.id;
}

export async function insertStatusResultDatabaseItem(
    notionClient: Client,
    resultDBId: string,
    status: string,
    counter: number,
) {
    await notionClient.pages.create({
        parent: {
            database_id: resultDBId,
        },
        properties: {
            [statusData.Status.name]: {
                title: [{ text: { content: status } }],
            },
            [statusData.Counter.name]: {
                number: counter,
            },
            [statusData.LastUpdateDate.name]: {
                date: { start: new Date(Date.now()).toISOString() },
            },
        },
    });
    return 'resultPage';
}

/**
 * @description: 在当前数值的基础上增加对应的值, 不变的写入0
 * @return {*}
 */
export async function updateStatusResultDatabaseItem(
    notionClient: Client,
    resultDBId: string,
    status: string,
    counter: number,
) {
    const statusResult = await notionClient.databases.query({
        database_id: resultDBId,
        filter: {
            or: [
                {
                    property: statusData.Status.name,
                    title: {
                        equals: status,
                    },
                },
            ],
        },
    });
    if (statusResult.results.length) {
        await Promise.all(
            statusResult.results.map(async (page) => {
                const pageId = page.id;
                // 累积更新
                await notionClient.pages.update({
                    page_id: pageId,
                    properties: {
                        [statusData.Counter.name as string]: {
                            number: counter,
                        },
                        [statusData.LastUpdateDate.name as string]: {
                            date: { start: new Date(Date.now()).toISOString() },
                        },
                    },
                });
            }),
        );
    } else {
        await insertStatusResultDatabaseItem(notionClient, resultDBId, status, counter);
    }

    return 'resultPage';
}

export async function getDefaultAllContributorInfo() {
    const members: Map<string, IMember> = new Map();
    members.set('nicodemusid', {
        id: 'nicodemusid',
        name: 'nicodemus du',
        totalPoints: 0,
        type: EPropertyType.PEOPLE,
    });

    return members;
}

/**
 * @description: 为数据源Database创建所有统计需要用到的字段
 * @param {Client} notionClient
 * @param {string} dbId
 * @param {Map} propertyIdMap
 * @param {*} string
 * @return {*}
 */
export async function createAutofillPropertyInStatisticsSource(
    notionClient: Client,
    dbId: string,
    propertyIdMap: Map<string, string>,
) {
    let needUpdate = false;
    await Promise.all(
        Array.from(propertyIdMap.values()).map(async (propertyName) => {
            const hasProperty = await hasPropertyInDatabase(notionClient, dbId, propertyName);
            // 如果有属性不存在,需要重新更新数据库的属性.
            if (!hasProperty) {
                needUpdate = true;
            }
        }),
    );
    if (needUpdate) {
        // 更新所有程序计算要用到的Configuration数据库字段
        await notionClient.databases.update({
            database_id: dbId,
            properties: {
                [propertyIdMap.get(EConfigurationItem.Filed_InformationSourceEndTimeFiledName) as string]: {
                    type: 'date',
                    date: {},
                },
                [propertyIdMap.get(EConfigurationItem.Filed_TranslationStartTimeFiledName) as string]: {
                    type: 'date',
                    date: {},
                },
                [propertyIdMap.get(EConfigurationItem.Filed_TranslationEndTimeFiledName) as string]: {
                    type: 'date',
                    date: {},
                },
                [propertyIdMap.get(EConfigurationItem.Filed_ProofreadStartTimeFiledName) as string]: {
                    type: 'date',
                    date: {},
                },
                [propertyIdMap.get(EConfigurationItem.Filed_ProofreadonEndTimeFiledName) as string]: {
                    type: 'date',
                    date: {},
                },
                [propertyIdMap.get(EConfigurationItem.Filed_TaskIdFiledName) as string]: {
                    type: 'rich_text',
                    rich_text: {},
                },
                [propertyIdMap.get(EConfigurationItem.Filed_StatusFiledName) as string]: {
                    type: 'select',
                    select: {
                        options: [
                            { name: EStatusType.WaitTranslation },
                            { name: EStatusType.InTranslation },
                            { name: EStatusType.WaitProofread },
                            { name: EStatusType.InProofead },
                            { name: EStatusType.FinishedProofead },
                            { name: EStatusType.WaitRelease },
                            { name: EStatusType.FinishedRelease },
                        ],
                    },
                },
            },
        });
    }
}
