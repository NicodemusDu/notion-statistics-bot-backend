/*
 * @Author: Nicodemus nicodemusdu@gmail.com
 * @Date: 2022-10-13 12:29:24
 * @LastEditors: Nicodemus nicodemusdu@gmail.com
 * @LastEditTime: 2022-10-17 12:22:38
 * @FilePath: /notion-statistics-bot-backend/src/server/notion/error.ts
 * @Description:
 *
 * Copyright (c) 2022 by Nicodemus nicodemusdu@gmail.com, All Rights Reserved.
 */
export class UserError extends Error {
    constructor(message: string) {
        super();
        this.name = 'UserError';
        this.message = message;
    }
}
