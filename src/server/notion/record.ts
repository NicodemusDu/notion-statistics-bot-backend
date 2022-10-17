/*
 * @Author: Nicodemus nicodemusdu@gmail.com
 * @Date: 2022-10-12 15:26:36
 * @LastEditors: Nicodemus nicodemusdu@gmail.com
 * @LastEditTime: 2022-10-17 22:16:18
 * @FilePath: /notion-statistics-bot-backend/src/server/notion/record.ts
 * @Description: 统计条目记录表,也是统计结果的数据源
 *
 * Copyright (c) 2022 by Nicodemus nicodemusdu@gmail.com, All Rights Reserved.
 */
import { EDatabaseName, IRecordDatabaseModel } from './types';
import { Client } from '@notionhq/client';
import { PersonUserObjectResponse } from '@notionhq/client/build/src/api-endpoints';
import { recordDatabaseModelData as recordData } from './data';

// 信息源

// 翻译

// 校对

// 赏金

/**
 * @description: 创建一个Record数据库
 * @param {Client} notionClient
 * @param {string} parentId 数据库存放的页面Id
 * @param {EDatabaseName} dbName 数据库名称
 * @return {*}
 */
export async function createRecordDatabase(notionClient: Client, parentId: string, dbName: EDatabaseName) {
    const newDB = await notionClient.databases.create({
        title: [{ text: { content: dbName } }],
        description: [{ text: { content: '用于存放统计结果' } }],
        parent: { page_id: parentId, type: 'page_id' },
        properties: {
            [recordData.TaskId.name]: {
                type: 'title',
                title: {},
            },
            // 记录了task当前存储在哪个数据库中
            [recordData.FromDatabaseId.name]: {
                type: 'rich_text',
                rich_text: {},
            },
            [recordData.ContributorId.name]: {
                type: 'rich_text',
                rich_text: {},
            },
            [recordData.Contributor.name]: {
                type: 'people',
                people: {},
            },
            [recordData.Points.name]: {
                type: 'number',
                number: { format: 'number' },
            },
            [recordData.StartRecordDate.name]: {
                type: 'date',
                date: {},
            },
            [recordData.EndRecordDate.name]: {
                type: 'date',
                date: {},
            },
            [recordData.IsStatisticsCompleted.name]: {
                type: 'checkbox',
                checkbox: {},
            },
        },
    });
    return newDB.id;
}

/**
 * @description: 向指定Record数据库中插入一条记录
 * @param {Client} notionClient
 * @param {string} recordDBId
 * @param {string} taskId
 * @param {string} fromDatabaseId
 * @param {PersonUserObjectResponse} contributor
 * @param {number} points
 * @return {*}
 */
export async function insertRecordDatabaseItem(
    notionClient: Client,
    recordDBId: string,
    taskId: string,
    fromDatabaseId: string,
    contributor: PersonUserObjectResponse,
    points: number,
    startDateISOString: string,
    endDateISOString: string,
    isCompleted = false,
) {
    const result = await notionClient.pages.create({
        parent: {
            database_id: recordDBId,
        },
        properties: {
            [recordData.TaskId.name]: {
                title: [{ text: { content: taskId } }],
            },
            [recordData.FromDatabaseId.name]: {
                rich_text: [{ text: { content: fromDatabaseId } }],
            },
            [recordData.FromDatabaseId.name]: {
                rich_text: [{ text: { content: fromDatabaseId } }],
            },
            [recordData.ContributorId.name]: {
                rich_text: [{ text: { content: contributor.id } }],
            },
            [recordData.Contributor.name]: {
                people: [contributor],
            },
            [recordData.Points.name]: {
                number: points,
            },
            [recordData.StartRecordDate.name]: {
                date: { start: startDateISOString },
            },
            [recordData.EndRecordDate.name]: {
                date: { start: endDateISOString },
            },
            [recordData.IsStatisticsCompleted.name]: {
                checkbox: isCompleted,
            },
        },
    });
    return result;
}
