/*
 * @Author: Nicodemus nicodemusdu@gmail.com
 * @Date: 2022-10-12 15:21:01
 * @LastEditors: Nicodemus nicodemusdu@gmail.com
 * @LastEditTime: 2022-10-20 14:39:20
 * @FilePath: /notion-statistics-bot-backend/src/server/notion/utils.ts
 * @Description: notion 基本操作工具(增删改查)
 *
 * Copyright (c) 2022 by Nicodemus nicodemusdu@gmail.com, All Rights Reserved.
 */
import { Client, isFullPage } from '@notionhq/client';
import {
    ListUsersResponse,
    PropertyItemListResponse,
    PropertyItemObjectResponse,
    NumberPropertyItemObjectResponse,
    QueryDatabaseResponse,
    PageObjectResponse,
    PersonUserObjectResponse,
    RichTextItemResponse,
} from '@notionhq/client/build/src/api-endpoints';
import { notionClient, logger } from '.';
import { UserError } from './error';
import { IContributor } from './types';
import { v4 as uuidv4, parse as uuidParse } from 'uuid';
/**
 * @description: 查找名称为dbName的数据库, 如果想查找所有数据库,就不要给dbName赋值
 * @param {Client} notionClient
 * @param {string} dbName
 * @return {*}
 */
export async function searchDatabase(notionClient: Client, dbName?: string) {
    try {
        const res = await notionClient.search({
            filter: {
                property: 'object',
                value: 'database',
            },
            query: dbName ?? '',
        });
        return res.results;
    } catch {
        return undefined;
    }
}
/**
 * @description: 查找名称为pageName的页, 如果想查找所有页,就不要给pageName赋值
 * @param {Client} notionClient
 * @param {string} pageName
 * @return {*}
 */
export async function searchPage(notionClient: Client, pageName?: string) {
    try {
        const res = await notionClient.search({
            filter: {
                property: 'object',
                value: 'page',
            },
            query: pageName ?? '',
        });
        return res.results;
    } catch {
        return undefined;
    }
}

/**
 * @description: 获取数据库模型中所有属性的信息(不包含数据库存储的值)
 * @param {Client} nocionClient
 * @param {string} databaseId
 * @return {*}
 */
export async function getDatabaseProperties(nocionClient: Client, databaseId: string) {
    const response = await nocionClient.databases.retrieve({ database_id: databaseId });
    const titles = [];
    for (const per in response.properties) {
        titles.push(response.properties[per]);
    }
    return titles;
}

/**
 * @description: 判断属性propertyName是否在databaseId数据库中
 * @param {Client} notionClient
 * @param {string} databaseId
 * @param {string} propertyName
 * @return {*}
 */
export async function hasPropertyInDatabase(notionClient: Client, databaseId: string, propertyName: string) {
    const response = await notionClient.databases.retrieve({ database_id: databaseId });

    return response.properties[propertyName] ? true : false;
}

/**
 * @description: 获取一个数据库中所有的页面
 * @param {Client} nocionClient
 * @param {string} databaseId
 * @return {*}
 */
export async function getDatabaseAllPages(nocionClient: Client, databaseId: string) {
    const pages = [];
    let cursor: string | null = null;
    do {
        const ret = (await notionClient.databases.query({
            database_id: databaseId,
            start_cursor: cursor ? cursor : undefined,
        })) as QueryDatabaseResponse;

        pages.push(...(ret.results as PageObjectResponse[]));
        cursor = ret.next_cursor;
    } while (cursor !== null);
    return pages;
}

/**
 * @description: 获取一页中所有属性信息(包括数值,但是没有好的办法去读取各个类型的值)
 * @param {Client} notionClient
 * @param {string} pageId
 * @return {*}
 */
export async function getPageAllProperties(notionClient: Client, pageId: string) {
    const result = await notionClient.pages.retrieve({ page_id: pageId });
    if (isFullPage(result)) {
        return result.properties;
    } else {
        throw new UserError('getPageAllProperties: 读取属性失败');
    }
}

/**
 * @description: 只能获取members(也就是管理员),所有的贡献者要根据文档来统计
 * @return {*}
 */
export async function getAllAdmins(notionClient: Client) {
    let nextCursor;
    const user_list: IContributor[] = [];

    do {
        const users = (await notionClient.users.list({
            start_cursor: nextCursor,
        })) as ListUsersResponse;
        nextCursor = users.next_cursor;
        users.results.map((user) => {
            if (user.type !== 'bot') {
                user_list.push({
                    id: user.id,
                    name: user.name ?? 'unname',
                    avatar_url: user.avatar_url ?? '',
                });
            }
        });
    } while (nextCursor);
    return user_list;
}

/**
 * @description:  获取页面中属性值
 * @param {Client} notionClient
 * @param {string} pageId
 * @param {string} propertyId 要获取的属性Id
 * @return {*}
 */
export async function getPagePropertyValue(notionClient: Client, pageId: string, propertyId: string) {
    const propertyItem = await notionClient.pages.properties.retrieve({
        page_id: pageId,
        property_id: propertyId,
    });
    if (propertyItem.object === 'property_item') {
        return propertyItem;
    }

    // Property is paginated.
    let nextCursor = propertyItem.next_cursor;
    const results = propertyItem.results;

    while (nextCursor !== null) {
        const propertyItem = (await notionClient.pages.properties.retrieve({
            page_id: pageId,
            property_id: propertyId,
            start_cursor: nextCursor,
        })) as PropertyItemListResponse;

        nextCursor = propertyItem.next_cursor;
        results.push(...propertyItem.results);
    }
    return results;
}

/**
 * @description: 获取一个Number属性值
 * // TODO: 类型判断太臃肿了,精简一下
 * @param {Client} notionClient
 * @param {string} pageId
 * @param {string} propertyId
 * @return {*}
 */
export async function getNumberPropertyValue(notionClient: Client, pageId: string, propertyId: string) {
    const result = await getPagePropertyValue(notionClient, pageId, propertyId);
    if (isPropertyList(result)) {
        if ((result as PropertyItemObjectResponse[])[0].type === 'number') {
            return (result as NumberPropertyItemObjectResponse[])[0].number;
        } else {
            throw new UserError('getNumberPropertyValue: 返回值类型错误,不是number');
        }
    } else {
        if ((result as NumberPropertyItemObjectResponse).type === 'number') {
            return (result as NumberPropertyItemObjectResponse).number;
        } else {
            throw new UserError('getNumberPropertyValue: 返回值类型错误,不是number');
        }
    }
}
/**
 * @description: 获取一个RichText属性值
 * @param {Client} notionClient
 * @param {string} pageId
 * @param {string} propertyId
 * @return {*}
 */
export async function getRichTextPropertyValue(notionClient: Client, pageId: string, propertyId: string) {
    const result = await getPagePropertyValue(notionClient, pageId, propertyId);

    if (result && 'length' in result && result.length && result[0].type === 'rich_text') {
        return result[0].rich_text.plain_text;
    } else {
        throw new UserError('返回值类型错误,不是rich_text');
    }
}

export function idToString(id: string) {
    return id.replace(/[^a-zA-Z0-9]/g, '');
}

function isPropertyList(propertyRes: PropertyItemObjectResponse | PropertyItemObjectResponse[]) {
    if (propertyRes && 'length' in propertyRes && propertyRes.length) {
        return true;
    } else {
        return false;
    }
}

/**
 * @description: 获取一个随机UUID
 * @return {*}
 */
export function getUUID() {
    return uuidv4();
}

/**
 * @description: 判断传进来的UUID是否有效
 * @param {string} uuid
 * @return {*}
 */
export function isValidUUID(uuid: string) {
    try {
        uuidParse(uuid);
        return true;
    } catch {
        return false;
    }
}

/**
 * @description: 在一个页面中新建一个uuid
 * @param {string} pageId
 * @param {string} uuidFiledName uuid在页面中存储的字段名
 * @return {*}
 */
export function createUUIDForPage(pageId: string, uuidFiledName: string) {
    try {
        const taskId = getUUID();
        notionClient.pages.update({
            page_id: pageId,
            properties: {
                [uuidFiledName]: {
                    rich_text: [{ text: { content: taskId } }],
                },
            },
        });
        return taskId;
    } catch {
        return null;
    }
}

/**
 * @description: 检查一个标题是否已经在数据库中存在了
 * @param {Client} nocionClient
 * @param {string} dbId
 * @param {string} titleValue
 * @param {string} titleName
 * @return {*} null 不存在, string 返回找到的pageId
 */
export async function isExistTitleInRecordDatabase(
    nocionClient: Client,
    dbId: string,
    titleValue: string,
    titleName: string,
): Promise<string | null> {
    // 检查taskID在recordDB中是否存在
    const isExistTaskId = await notionClient.databases.query({
        database_id: dbId,
        filter: {
            or: [
                {
                    property: titleName,
                    title: {
                        equals: titleValue,
                    },
                },
            ],
        },
    });
    let pageId = null;
    isExistTaskId.results.map((page) => {
        pageId = page.id;
    });
    return pageId;
}

/** 接收到的PropertyResponse转换为想要的类型 */

/**
 * @description: 解析PageResponse的Person属性
 * @param {PageObjectResponse} pageResponse
 * @param {string} propertyName
 * @return {*} 如果指定的属性名中包含person属性,就把对应的person列表返回,否则返回空列表
 */
export function pageResponseToPersonList(
    pageResponse: PageObjectResponse,
    propertyName: string,
): PersonUserObjectResponse[] {
    const person = pageResponse.properties[propertyName];
    const list: PersonUserObjectResponse[] = [];
    if (person.type === 'people' && person.people.length && 'type' in person.people[0]) {
        person.people.map((p) => {
            if ('type' in p && p.type === 'person') {
                list.push(p);
            }
        });
    }
    return list;
}

/**
 * @description: 解析PageResponse的rich_text或者title属性
 * @param {PageObjectResponse} pageResponse
 * @param {string} propertyName
 * @return {*} 如果指定的属性名中包含rich_text属性,就把对应的string列表返回,否则返回空列表
 */
export function pageResponseToRichTextList(pageResponse: PageObjectResponse, propertyName: string): string[] | null {
    const list: string[] = [];
    try {
        const textObj = pageResponse.properties[propertyName];
        let richArray: RichTextItemResponse[] = [];
        if (textObj.type === 'rich_text') {
            richArray = textObj.rich_text;
        } else if (textObj.type === 'title') {
            richArray = textObj.title;
        }
        richArray.map((text) => {
            list.push(text.plain_text);
        });
    } catch {
        return null;
    }
    return list;
}

/**
 * @description: 解析PageResponse的Number属性
 * @param {PageObjectResponse} pageResponse
 * @param {string} propertyName
 * @return {*} 如果指定的属性名是Number属性,就返回对应的number; 如果不是Number属性或者没有值,就返回null
 */
export function pageResponseToNumber(pageResponse: PageObjectResponse, propertyName: string): number | null {
    const numObj = pageResponse.properties[propertyName];
    if (numObj.type === 'number' && numObj.number) {
        return numObj.number;
    }
    return null;
}

/**
 * @description: 解析PageResponse的Formula(公式)属性
 * @param {PageObjectResponse} pageResponse
 * @param {string} propertyName
 * @return {*} 如果指定的属性名是Formula属性,并且公式的值是Number就返回对应的number; 如果不是Number属性或者没有值,就返回null
 */
export function pageResponseFormulaToNumber(pageResponse: PageObjectResponse, propertyName: string): number | null {
    const formulaObj = pageResponse.properties[propertyName];
    if (formulaObj.type === 'formula' && formulaObj.formula.type === 'number') {
        return formulaObj.formula.number;
    }
    return null;
}

/**
 * @description:
 * @param {PageObjectResponse} pageResponse
 * @param {string} propertyName
 * @return {*}
 */
export function pageResponseStartDateToISOString(
    pageResponse: PageObjectResponse,
    propertyName: string,
): string | null {
    const dateObj = pageResponse.properties[propertyName];

    if (dateObj.type === 'date' && dateObj.date?.start) {
        return dateObj.date.start;
    }
    return null;
}
