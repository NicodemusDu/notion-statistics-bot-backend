/*
 * @Author: Nicodemus nicodemusdu@gmail.com
 * @Date: 2022-10-11 19:00:50
 * @LastEditors: Nicodemus nicodemusdu@gmail.com
 * @LastEditTime: 2022-10-20 16:35:10
 * @FilePath: /notion-statistics-bot-backend/src/server/index.ts
 * @Description:
 *
 * Copyright (c) 2022 by Nicodemus nicodemusdu@gmail.com, All Rights Reserved.
 */
import { Logger } from 'tsrpc';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
dayjs.extend(duration);
import dotenv from 'dotenv';
dotenv.config();

import {
    initNotionStatistics,
    doOnceRecordAllTheTime,
    doOnceStatisticsBeforToday,
    projectDBConfig as SeeDAOProjectConfig,
    notionClient as SeeDAOProjectClient,
    testNotion,
} from './notion/index';

export async function test(logger: Logger) {
    await initNotionStatistics(logger);
    // 启动定时同步功能
    // await setInterval(async () => {
    //     await doOnceRecordAllTheTime(SeeDAOProjectClient, SeeDAOProjectConfig);
    //     await doOnceStatisticsBeforToday(SeeDAOProjectClient, SeeDAOProjectConfig);
    // }, dayjs.duration(10, 'minute').asMilliseconds());

    // 调试
    await testNotion();
}
