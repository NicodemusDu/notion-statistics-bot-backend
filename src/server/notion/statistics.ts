/*
 * @Author: Nicodemus nicodemusdu@gmail.com
 * @Date: 2022-10-12 15:25:08
 * @LastEditors: Nicodemus nicodemusdu@gmail.com
 * @LastEditTime: 2022-10-14 12:15:05
 * @FilePath: /backend/src/server/notion/statistics.ts
 * @Description: 统计过程的相关操作和统计结果的数据库操作
 *
 * Copyright (c) 2022 by Nicodemus nicodemusdu@gmail.com, All Rights Reserved.
 */
import { Client, isFullPage } from '@notionhq/client';
import { PersonUserObjectResponse } from '@notionhq/client/build/src/api-endpoints';
import { IMember, EPropertyType, EDatabaseName } from './types';
import { resultDatabaseModelData } from './data';
import { Logger } from 'tsrpc';
import { UserError } from './error';
import { getNumberPropertyValue } from './utils';

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
    logger: Logger,
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
        const result = await notionClient.pages.update({
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
        logger.log('result value:\t', result);
    } else {
        throw new UserError(`没有找到当前页${itemPageId}`);
    }

    return 'resultPage';
}

export async function getAllContributor() {
    const members: Map<string, IMember> = new Map();
    members.set('nicodemusid', {
        id: 'nicodemusid',
        name: 'nicodemus du',
        totalPoints: 0,
        type: EPropertyType.PEOPLE,
    });

    return members;
}
let members: Map<string, IMember> = new Map();
async () => {
    members = await getAllContributor();
};

/**
 * @description: 如果传入的member已经存在, 就更新信息存储列表
 * @param {IMember} memberInfo
 * @return {*}
 */
export async function updateMemberRecord(memberInfo: IMember) {
    const member = members.get(memberInfo.id);
    if (member) {
        memberInfo.informationSourceList && member.informationSourceList?.push(...memberInfo.informationSourceList);
        memberInfo.translationList && member.translationList?.push(...memberInfo.translationList);
        memberInfo.proofeadList && member.proofeadList?.push(...memberInfo.proofeadList);
        memberInfo.bountyList && member.bountyList?.push(...memberInfo.bountyList);
    } else {
        members.set(memberInfo.id, memberInfo);
    }
}
