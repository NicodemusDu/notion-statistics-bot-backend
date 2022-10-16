/*
 * @Author: Nicodemus nicodemusdu@gmail.com
 * @Date: 2022-10-11 19:00:50
 * @LastEditors: Nicodemus nicodemusdu@gmail.com
 * @LastEditTime: 2022-10-14 17:23:21
 * @FilePath: /backend/src/server/index.ts
 * @Description:
 *
 * Copyright (c) 2022 by Nicodemus nicodemusdu@gmail.com, All Rights Reserved.
 */
import { Logger } from 'tsrpc';
import dotenv from 'dotenv';
dotenv.config();

import { initNotionStatistics, testNotion } from './notion/index';

export async function test(logger: Logger) {
    await initNotionStatistics(logger);
    await testNotion();
}
