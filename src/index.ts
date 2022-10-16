/*
 * @Author: Nicodemus nicodemusdu@gmail.com
 * @Date: 2022-10-10 16:01:04
 * @LastEditors: Nicodemus nicodemusdu@gmail.com
 * @LastEditTime: 2022-10-11 19:01:53
 * @FilePath: /backend/src/index.ts
 * @Description:
 *
 * Copyright (c) 2022 by Nicodemus nicodemusdu@gmail.com, All Rights Reserved.
 */
import * as path from 'path';
import { HttpServer, Logger } from 'tsrpc';
import { serviceProto } from './shared/protocols/serviceProto';
import { test } from './server/index';
// Create the Server
const server = new HttpServer(serviceProto, {
    port: 3000,
    // Remove this to use binary mode (remove from the client too)
    json: true,
});

// Initialize before server start
async function init() {
    // Auto implement APIs
    await server.autoImplementApi(path.resolve(__dirname, 'api'));

    // TODO
    // Prepare something... (e.g. connect the db)
}

// Entry function
async function main() {
    // await init();
    await server.start();
    test(server.logger);
}
main();
