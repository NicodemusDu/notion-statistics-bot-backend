/*
 * @Author: Nicodemus nicodemusdu@gmail.com
 * @Date: 2022-10-12 15:24:50
 * @LastEditors: Nicodemus nicodemusdu@gmail.com
 * @LastEditTime: 2022-10-13 18:07:40
 * @FilePath: /backend/src/server/notion/configuration.ts
 * @Description: 用户配置数据库的相关操作
 *
 * Copyright (c) 2022 by Nicodemus nicodemusdu@gmail.com, All Rights Reserved.
 */
import { Client } from '@notionhq/client';
import { PropertyItemObjectResponse } from '@notionhq/client/build/src/api-endpoints';
import { configurationInitData } from './data';
import { EDatabaseName, EConfigurationItem, EPropertyType } from './types';
import { getPagePropertyValue } from './utils';

export async function createConfigurationDatabase(notionClient: Client, parentId: string) {
    const newDB = await notionClient.databases.create({
        title: [{ text: { content: EDatabaseName.ConfigDBName } }],
        description: [{ text: { content: '用于存放统计软件的配置项目' } }],
        parent: { page_id: parentId, type: 'page_id' },
        properties: {
            Key: {
                type: 'title',
                title: {},
            },
            Value: {
                type: 'rich_text',
                rich_text: {},
            },
            Description: {
                type: 'rich_text',
                rich_text: {},
            },
        },
    });
    return newDB.id;
}
/**
 * @description: 创建Configuration数据库后初始化数据库数据(如果当前数据库存在就不要调用初始化了,没有做数据重复检验)
 * @param {Client} notionClient
 * @param {string} configDBId
 * @return {*}
 */
export async function initConfigurationDatabase(notionClient: Client, configDBId: string) {
    const createConfigRow = async (
        dbId: string,
        KeyContent: string,
        ValueContent: string,
        DescriptionContent: string,
    ) => {
        await notionClient.pages.create({
            parent: {
                database_id: dbId,
            },
            properties: {
                Key: {
                    title: [{ text: { content: KeyContent } }],
                },
                Description: {
                    rich_text: [{ text: { content: DescriptionContent } }],
                },
                Value: {
                    rich_text: [{ text: { content: ValueContent } }],
                },
            },
        });
    };
    try {
        configurationInitData.map((data) => {
            createConfigRow(configDBId, data.Key, data.Value, data.Description);
        });
        return true;
    } catch {
        return false;
    }
}

/**
 * @description: 更新Configuration数据库中指定key的值
 * @param {Client} notionClient
 * @param {string} configDBId
 * @param {EConfigurationItem} configItemName
 * @param {string} value
 * @return {*}
 */
export async function updateConfigurationItemValue(
    notionClient: Client,
    configDBId: string,
    configItemName: EConfigurationItem,
    value: string,
): Promise<boolean> {
    const page = await getConfigurationItemPage(notionClient, configDBId, configItemName);
    if (page) {
        try {
            await notionClient.pages.update({
                page_id: page.id,
                properties: {
                    Value: {
                        rich_text: [{ text: { content: value } }],
                    },
                },
            });
            return true;
        } catch (err) {
            console.error('err:\t', err);
            return false;
        }
    } else {
        return false;
    }
}

export async function getConfigurationItemValue(notionClient: Client, configDBId: string, key: EConfigurationItem) {
    const page = await getConfigurationItemPage(notionClient, configDBId, key);
    if (page) {
        const result = await getPagePropertyValue(notionClient, page.id, 'Value');

        if (result && 'length' in result && result.length && result[0].type === 'rich_text') {
            return result[0].rich_text.plain_text;
        }
        return undefined;
    } else {
        return undefined;
    }
}

/**
 * @description: 通过key name获取key id
 * @param {Client} notionClient
 * @param {string} configDBId
 * @param {EConfigurationItem} key
 * @return {*}
 */
export async function getConfigurationItemPage(notionClient: Client, configDBId: string, key: EConfigurationItem) {
    const pages = await notionClient.databases.query({
        database_id: configDBId,
        filter: {
            or: [
                {
                    property: 'Key',
                    title: {
                        equals: key,
                    },
                },
            ],
        },
    });
    if (pages.results.length) {
        return pages.results[0];
    } else {
        return undefined;
    }
}
// export async function getConfigurationItemId(notionClient: Client, configDBId: string, key: EConfigurationItem) {
//     let pageId: string | undefined;
//     const result = await notionClient.databases.retrieve({
//         database_id: configDBId,
//     });
//     for (const property in result.properties) {
//         console.log('property:\t', result.properties[property].name);
//         if (result.properties[property].name === key) {
//             pageId = result.properties[key].id;
//         }
//     }
//     return pageId;
// }
