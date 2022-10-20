/*
 * @Author: Nicodemus nicodemusdu@gmail.com
 * @Date: 2022-10-12 15:25:08
 * @LastEditors: Nicodemus nicodemusdu@gmail.com
 * @LastEditTime: 2022-10-20 12:07:52
 * @FilePath: /notion-statistics-bot-backend/src/server/notion/statistics.ts
 * @Description: 统计过程的相关操作和统计结果的数据库操作
 *
 * Copyright (c) 2022 by Nicodemus nicodemusdu@gmail.com, All Rights Reserved.
 */
import { Client, isFullPage } from '@notionhq/client';
import { PersonUserObjectResponse } from '@notionhq/client/build/src/api-endpoints';
import { IMember, EPropertyType, EDatabaseName, EConfigurationItem } from './types';
import { resultDatabaseModelData } from './data';
import { Logger } from 'tsrpc';
import { UserError } from './error';
import { getNumberPropertyValue, hasPropertyInDatabase } from './utils';

export async function createResultDatabase(notionClient: Client, parentId: string) {
    const newDB = await notionClient.databases.create({
        title: [{ text: { content: EDatabaseName.ResultDBName } }],
        description: [{ text: { content: '用于存放统计结果' } }],
        parent: { page_id: parentId, type: 'page_id' },
        properties: {
            [resultDatabaseModelData.ContributorId.name]: {
                type: 'title',
                title: {},
            },
            [resultDatabaseModelData.Contributor.name]: {
                type: 'people',
                people: {},
            },
            [resultDatabaseModelData.InformationSource.name]: {
                type: 'number',
                number: { format: 'number' },
            },
            [resultDatabaseModelData.Translation.name]: {
                type: 'number',
                number: { format: 'number' },
            },
            [resultDatabaseModelData.Proofead.name]: {
                type: 'number',
                number: { format: 'number' },
            },
            [resultDatabaseModelData.Bounty.name]: {
                type: 'number',
                number: { format: 'number' },
            },
            [resultDatabaseModelData.Points.name]: {
                type: 'number',
                number: { format: 'number' },
            },
            [resultDatabaseModelData.LastUpdateDate.name]: {
                type: 'date',
                date: {},
            },
        },
    });
    return newDB.id;
}

export async function insertResultDatabaseItem(
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
            [resultDatabaseModelData.ContributorId.name]: {
                title: [{ text: { content: contributor.id } }],
            },
            [resultDatabaseModelData.Contributor.name]: {
                people: [contributor],
            },
            [resultDatabaseModelData.InformationSource.name]: {
                number: source,
            },
            [resultDatabaseModelData.Translation.name]: {
                number: translation,
            },
            [resultDatabaseModelData.Proofead.name]: {
                number: proofead,
            },
            [resultDatabaseModelData.Bounty.name]: {
                number: bounty,
            },
            [resultDatabaseModelData.Points.name]: {
                number: points,
            },
            [resultDatabaseModelData.LastUpdateDate.name]: {
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
export async function increaseResultDatabaseItem(
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
            current.properties[resultDatabaseModelData.InformationSource.name].id,
        );
        const currentTranslation = await getNumberPropertyValue(
            notionClient,
            itemPageId,
            current.properties[resultDatabaseModelData.Translation.name].id,
        );
        const currentProofead = await getNumberPropertyValue(
            notionClient,
            itemPageId,
            current.properties[resultDatabaseModelData.Proofead.name].id,
        );
        const currentBoundy = await getNumberPropertyValue(
            notionClient,
            itemPageId,
            current.properties[resultDatabaseModelData.Bounty.name].id,
        );
        const currentPoints = await getNumberPropertyValue(
            notionClient,
            itemPageId,
            current.properties[resultDatabaseModelData.Points.name].id,
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
                [resultDatabaseModelData.InformationSource.name as string]: {
                    number: source + currentSource,
                },
                [resultDatabaseModelData.Translation.name as string]: {
                    number: translation + currentTranslation,
                },
                [resultDatabaseModelData.Proofead.name as string]: {
                    number: proofead + currentProofead,
                },
                [resultDatabaseModelData.Bounty.name as string]: {
                    number: bounty + currentBoundy,
                },
                [resultDatabaseModelData.Points.name as string]: {
                    number: points + currentPoints,
                },
                [resultDatabaseModelData.LastUpdateDate.name as string]: {
                    date: { start: new Date(Date.now()).toISOString() },
                },
            },
        });
    } else {
        throw new UserError(`没有找到当前页${itemPageId}`);
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
            },
        });
    }
}
