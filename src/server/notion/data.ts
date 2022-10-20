/*
 * @Author: Nicodemus nicodemusdu@gmail.com
 * @Date: 2022-10-12 11:42:24
 * @LastEditors: Nicodemus nicodemusdu@gmail.com
 * @LastEditTime: 2022-10-20 17:35:41
 * @FilePath: /notion-statistics-bot-backend/src/server/notion/data.ts
 * @Description:
 *
 * Copyright (c) 2022 by Nicodemus nicodemusdu@gmail.com, All Rights Reserved.
 */
import {
    IConfigurationDB,
    EConfigurationItem,
    IRecordDatabaseModel,
    IStatisticsResultDatabaseModel,
    IStatusResultDatabaseModel,
    EPropertyType,
} from './types';
export const configurationInitData: IConfigurationDB[] = [
    // 程序自动填写
    {
        Key: EConfigurationItem.Auto_StatisticsResultDBId,
        Value: '',
        Description: '!!!程序自动填写,除非Value为空,否则不要修改',
    },
    {
        Key: EConfigurationItem.Auto_StatusResultDBId,
        Value: '',
        Description: '!!!程序自动填写,除非Value为空,否则不要修改',
    },
    {
        Key: EConfigurationItem.Auto_InformationSourceRecordDBId,
        Value: '',
        Description: '!!!程序自动填写,除非Value为空,否则不要修改',
    },
    {
        Key: EConfigurationItem.Auto_TranslationRecordDBId,
        Value: '',
        Description: '!!!程序自动填写,除非Value为空,否则不要修改',
    },
    {
        Key: EConfigurationItem.Auto_ProofeadRecordDBId,
        Value: '',
        Description: '!!!程序自动填写,除非Value为空,否则不要修改',
    },
    {
        Key: EConfigurationItem.Auto_BountyRecordDBId,
        Value: '',
        Description: '!!!程序自动填写,除非Value为空,否则不要修改',
    },

    {
        Key: EConfigurationItem.StatisticsSource_ContributionDBIdList,
        Value: '5b0633ac4d634ff89dd1315e91de2635, 98d754c7037e484d8ef2ad7acb364b0e',
        Description: '填入所有想要统计工作量的列表(每个列表格式需要一致): !!!**用”,”分隔不同列表Id**!!!',
    },
    {
        Key: EConfigurationItem.StatisticsSource_BountyDBIdList,
        Value: '',
        Description: '填入所有想要统计的赏金任务列表(每个列表格式需要一致): !!!**用”,”分隔不同列表Id**!!!',
    },
    // 积分百分比
    {
        Key: EConfigurationItem.PointRatio_InformationSource,
        Value: '20',
        Description: '信源占总积分的百分比, 直接写数字,不要写百分号(信源+翻译+校对=100)',
    },
    {
        Key: EConfigurationItem.PointRatio_TranslationPointRatio,
        Value: '50',
        Description: '翻译占总积分的百分比, 直接写数字,不要写百分号(信源+翻译+校对=100)',
    },
    {
        Key: EConfigurationItem.PointRatio_ProofreadRatio,
        Value: '30',
        Description: '校对占总积分的百分比, 直接写数字,不要写百分号(信源+翻译+校对=100)',
    },
    // 统计源db的字段名称和程序做对应
    {
        Key: EConfigurationItem.Filed_TotalPointsFiledName,
        Value: '积分',
        Description: '[总积分]在统计源数据库中的字段名称(总积分列应该是number类型)',
    },
    {
        Key: EConfigurationItem.Filed_InformationSourceFiledName,
        Value: '信源',
        Description: '[信源]在统计源数据库中的字段名称(信源列应该是people类型)',
    },
    {
        Key: EConfigurationItem.Filed_TranslationFiledName,
        Value: '翻译',
        Description: '[翻译]在统计源数据库中的字段名称(翻译列应该是people类型)',
    },
    {
        Key: EConfigurationItem.Filed_ProofreadFiledName,
        Value: '校对',
        Description: '[校对]在统计源数据库中的字段名称(校对列应该是people类型)',
    },
    {
        Key: EConfigurationItem.Filed_InformationSourceEndTimeFiledName,
        Value: '信源完成时间',
        Description: '[信源完成时间]在统计源数据库中的字段名称(应该是Date类型, 24小时制)',
    },
    {
        Key: EConfigurationItem.Filed_TranslationStartTimeFiledName,
        Value: '翻译启动时间',
        Description: '[翻译启动时间]在统计源数据库中的字段名称(应该是Date类型, 24小时制)',
    },
    {
        Key: EConfigurationItem.Filed_TranslationEndTimeFiledName,
        Value: '翻译完成时间',
        Description: '[翻译完成时间]在统计源数据库中的字段名称(应该是Date类型, 24小时制)',
    },
    {
        Key: EConfigurationItem.Filed_ProofreadStartTimeFiledName,
        Value: '校对启动时间',
        Description: '[校对启动时间]在统计源数据库中的字段名称(应该是Date类型, 24小时制)',
    },
    {
        Key: EConfigurationItem.Filed_ProofreadonEndTimeFiledName,
        Value: '校对完成时间',
        Description: '[校对完成时间]在统计源数据库中的字段名称(应该是Date类型, 24小时制)',
    },
    {
        Key: EConfigurationItem.Filed_TaskIdFiledName,
        Value: '唯一标识',
        Description:
            '[TaskId]在统计源数据库中的字段名称(应该是rich_text类型,作为这条任务的唯一标识,不管移动到哪个数据库中都不变)',
    },
];

export const statisticsResultDatabaseModelData: IStatisticsResultDatabaseModel = {
    ContributorId: {
        name: 'ContributorId',
        type: EPropertyType.TITLE,
    },
    Contributor: {
        name: 'Contributor',
        type: EPropertyType.PEOPLE,
    },
    InformationSource: {
        name: 'InformationSource',
        type: EPropertyType.NUMBER,
        value: 0,
    },
    Translation: {
        name: 'Translation',
        type: EPropertyType.NUMBER,
        value: 0,
    },
    Proofead: {
        name: 'Proofead',
        type: EPropertyType.NUMBER,
    },
    Bounty: {
        name: 'Bounty',
        type: EPropertyType.NUMBER,
        value: 0,
    },
    Points: {
        name: 'Points',
        type: EPropertyType.NUMBER,
        value: 0,
    },
    LastUpdateDate: {
        name: 'LastUpdateDate',
        type: EPropertyType.DATE,
    },
};

export const statusResultDatabaseModelData: IStatusResultDatabaseModel = {
    Status: {
        name: 'Status',
        type: EPropertyType.TITLE,
    },
    Counter: {
        name: 'Counter',
        type: EPropertyType.NUMBER,
        value: 0,
    },
    LastUpdateDate: {
        name: 'LastUpdateDate',
        type: EPropertyType.DATE,
    },
};

export const recordDatabaseModelData: IRecordDatabaseModel = {
    TaskId: {
        name: 'TaskId',
        type: EPropertyType.TITLE,
    },
    FromDatabaseId: {
        name: 'FromDatabaseId',
        type: EPropertyType.RICH_TEXT,
    },
    ContributorId: {
        name: 'ContributorId',
        type: EPropertyType.RICH_TEXT,
    },
    Contributor: {
        name: 'Contributor',
        type: EPropertyType.PEOPLE,
    },
    Points: {
        name: 'Points',
        type: EPropertyType.NUMBER,
    },
    StartRecordDate: {
        name: 'StartRecordDate',
        type: EPropertyType.DATE,
    },
    EndRecordDate: {
        name: 'EndRecordDate',
        type: EPropertyType.DATE,
    },
    IsStatisticsCompleted: {
        name: 'IsStatisticsCompleted',
        type: EPropertyType.CHECKBOX,
    },
};
