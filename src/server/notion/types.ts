/*
 * @Author: Nicodemus nicodemusdu@gmail.com
 * @Date: 2022-10-10 22:23:20
 * @LastEditors: Nicodemus nicodemusdu@gmail.com
 * @LastEditTime: 2022-10-14 18:11:24
 * @FilePath: /backend/src/server/notion/types.ts
 * @Description:
 *
 * Copyright (c) 2022 by Nicodemus nicodemusdu@gmail.com, All Rights Reserved.
 */
export interface IContributor {
    id: string;
    name: string;
    avatar_url?: string;
}
export enum EPropertyType {
    TITLE = 'title',
    RICH_TEXT = 'rich_text',
    NUMBER = 'number',
    SELECT = 'select',
    MULTI_SELECT = 'multi_select',
    DATE = 'date',
    PEOPLE = 'people',
    FILES = 'files',
    CHECKBOX = 'checkbox',
    URL = 'url',
    EMAIL = 'email',
    PHONE_NUMBER = 'phone_number',
    FORMULA = 'formula',
    RELATION = 'relation',
    ROLLUP = 'rollup',
    CREATED_TIME = 'created_time',
    CREATED_BY = 'created_by',
    LAST_EDITED_TIME = 'last_edited_time',
    LAST_EDITED_BY = 'last_edited_by',
    STATUS = 'status',
}

export interface IBaseType {
    id: string;
    name: string;
    type: EPropertyType;
}

export enum EStatusType {
    WaitTranslation = '待翻译',
    InTranslation = '翻译中',
    WaitProofread = '待校对',
    InProofead = '校对中',
    FinishedProofead = '已校完',
    WaitRelease = '待发布',
    FinishedRelease = '已发布',
}

export interface ITask {
    id: string; // 任务id(文章id, bounty id......)
    date: Date; // 完成日期
    points: number; // 积分
}

export interface IMember extends IBaseType {
    informationSourceList?: ITask[]; // 提供的信息源id列表
    translationList?: ITask[]; // 完成的翻译id列表
    proofeadList?: ITask[]; // 完成的校对列表
    bountyList?: ITask[]; // 完成的bounty
    totalPoints: number; // 积分
}

/**
 * @description: Configuration数据库的模型
 * @return {*}
 */
export interface IConfigurationDB {
    Key: string;
    Value: string;
    Description: string;
    Ccategory?: string; // TODO: 以后可以用这个字段区分config类型, 简化configuration item命名
}

/**
 * @description: 存放从Configuration Database中读取的配置信息
 * @return {*}
 */
export interface IProjectConfiguration {
    // 这个是从parent page根据Configuration数据库名称读取的
    ConfigurationDatabaseId: string;
    // 统计结果展示数据库ID
    StatisticsResultDBId: string;
    // 每一项统计保存的数据库, 是用于统计的数据源
    InformationSourceRecordDBId: string;
    TranslationRecordDBId: string;
    ProofeadRecordDBId: string;
    BountyRecordDBId: string;
    // 统计来源: StatisticsContribution 贡献度统计源, 统计文章翻译; StatisticsBounty 赏金统计源,统计赏金任务
    StatisticsContributionDBIdList: string[];
    StatisticsBountyDBIdList: string[];
}

export enum EDatabaseName {
    // 统计结果
    ResultDBName = 'StatisticsResultDB',
    // 配置文件
    ConfigDBName = 'ConfigurationDB',
    // 信源结算列表
    SourceRecordDBName = 'InformationSourceRecordDB',
    // 翻译结算列表
    TranslationRecordDBName = 'TranslationRecordDB',
    // 校对结算列表
    ProofeadRecordDBName = 'ProofeadRecordDB',
    // 赏金任务结算列表
    BountyRecordDBName = 'BountyRecordDB',
}

/**
 * @description: ConfigurationDB的Key值列表
 * @return {*}
 */
export enum EConfigurationItem {
    Auto_ResultDBId = 'Auto_ResultDBId',
    Auto_InformationSourceRecordDBId = 'Auto_InformationSourceRecordDBId',
    Auto_TranslationRecordDBId = 'Auto_TranslationRecordDBId',
    Auto_ProofeadRecordDBId = 'Auto_ProofeadRecordDBId',
    Auto_BountyRecordDBId = 'Auto_BountyRecordDBId',

    StatisticsSource_ContributionDBIdList = 'StatisticsSource_ContributionDBIdList',
    StatisticsSource_BountyDBIdList = 'StatisticsSource_BountyDBIdList',

    PointRatio_InformationSource = 'PointRatio_InformationSource',
    PointRatio_TranslationPointRatio = 'PointRatio_TranslationPointRatio',
    PointRatio_ProofreadRatio = 'PointRatio_ProofreadRatio',

    Filed_InformationSourceFiledName = 'Filed_InformationSourceFiledName',
    Filed_TranslationFiledName = 'Filed_TranslationFiledName',
    Filed_ProofreadFiledName = 'Filed_ProofreadFiledName',
    Filed_TotalPointsFiledName = 'Filed_TotalPointsFiledName',
    Filed_InformationSourceEndTimeFiledName = 'Filed_InformationSourceEndTimeFiledName',
    Filed_TranslationStartTimeFiledName = 'Filed_TranslationStartTimeFiledName',
    Filed_TranslationEndTimeFiledName = 'Filed_TranslationEndTimeFiledName',
    Filed_ProofreadStartTimeFiledName = 'Filed_ProofreadStartTimeFiledName',
    Filed_ProofreadonEndTimeFiledName = 'Filed_ProofreadonEndTimeFiledName',
}

export enum EResultItem {
    ContributorId = 'ContributorId',
    Contributor = 'Contributor',
    TaskId = 'TaskId',
    DatabaseId = 'DatabaseId',
    Points = 'Points',
    Date = 'Date',
}

/**          数据库模型                */
interface IDatabaseItem {
    name: string;
    type: EPropertyType;
}

export interface IRecordDatabaseModel {
    TaskId: IDatabaseItem;
    FromDatabaseId: IDatabaseItem;
    ContributorId: IDatabaseItem; // TODO: 这个也许用不到,看看要不要删掉
    Contributor: IDatabaseItem;
    Points: IDatabaseItem;
    LastRecordDate: IDatabaseItem;
}

export interface IStatisticsResultDatabaseModel {
    ContributorId: IDatabaseItem;
    Contributor: IDatabaseItem;
    InformationSource: IDatabaseItem;
    Translation: IDatabaseItem;
    Proofead: IDatabaseItem;
    Bounty: IDatabaseItem;
    Points: IDatabaseItem;
    LastUpdateDate: IDatabaseItem;
}
