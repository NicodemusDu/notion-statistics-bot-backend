/*
 * @Author: Nicodemus nicodemusdu@gmail.com
 * @Date: 2022-10-12 11:42:24
 * @LastEditors: Nicodemus nicodemusdu@gmail.com
 * @LastEditTime: 2022-10-14 15:26:49
 * @FilePath: /backend/src/server/notion/data.ts
 * @Description:
 *
 * Copyright (c) 2022 by Nicodemus nicodemusdu@gmail.com, All Rights Reserved.
 */
import {
    IConfigurationDB,
    EConfigurationItem,
    IRecordDatabaseModel,
    IStatisticsResultDatabaseModel,
    EPropertyType,
} from './types';
export const configurationInitData: IConfigurationDB[] = [
    // 程序自动填写
    { Key: EConfigurationItem.Auto_ResultDBId, Value: '', Description: '!!!程序自动填写,除非Value为空,否则不要修改' },
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
        Value: 'f52c45ea79764c84b02d78bbd4139772,0f8b2217d0a94966813c79cde52e7e11',
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
        Description: '[信源完成时间]在统计源数据库中的字段名称(应该是Date类型)',
    },
    {
        Key: EConfigurationItem.Filed_TranslationStartTimeFiledName,
        Value: '翻译启动时间',
        Description: '[翻译启动时间]在统计源数据库中的字段名称(应该是Date类型)',
    },
    {
        Key: EConfigurationItem.Filed_TranslationEndTimeFiledName,
        Value: '翻译完成时间',
        Description: '[翻译完成时间]在统计源数据库中的字段名称(应该是Date类型)',
    },
    {
        Key: EConfigurationItem.Filed_ProofreadStartTimeFiledName,
        Value: '校对启动时间',
        Description: '[校对启动时间]在统计源数据库中的字段名称(应该是Date类型)',
    },
    {
        Key: EConfigurationItem.Filed_ProofreadonEndTimeFiledName,
        Value: '校对完成时间',
        Description: '[校对完成时间]在统计源数据库中的字段名称(应该是Date类型)',
    },
];

export const resultDatabaseModelData: IStatisticsResultDatabaseModel = {
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
    },
    Translation: {
        name: 'Translation',
        type: EPropertyType.NUMBER,
    },
    Proofead: {
        name: 'Proofead',
        type: EPropertyType.NUMBER,
    },
    Bounty: {
        name: 'Bounty',
        type: EPropertyType.NUMBER,
    },
    Points: {
        name: 'Points',
        type: EPropertyType.NUMBER,
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
    LastRecordDate: {
        name: 'LastStatisticsDate',
        type: EPropertyType.DATE,
    },
};