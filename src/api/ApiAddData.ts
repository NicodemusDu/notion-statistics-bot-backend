/*
 * @Author: Nicodemus nicodemusdu@gmail.com
 * @Date: 2022-10-10 16:01:04
 * @LastEditors: Nicodemus nicodemusdu@gmail.com
 * @LastEditTime: 2022-10-10 17:38:41
 * @FilePath: /backend/src/api/ApiAddData.ts
 * @Description:
 *
 * Copyright (c) 2022 by Nicodemus nicodemusdu@gmail.com, All Rights Reserved.
 */
import { ApiCall } from 'tsrpc';
import { ReqAddData, ResAddData } from '../shared/protocols/PtlAddData';
import { AllData } from './ApiGetData';

// This is a demo code file
// Feel free to delete it

export default async function (call: ApiCall<ReqAddData, ResAddData>) {
    // Error
    if (call.req.content === '') {
        call.error('Content is empty');
        return;
    }

    const time = new Date();
    AllData.unshift({
        content: call.req.content,
        time: time,
    });
    console.log('AllData', AllData);

    // Success
    call.succ({
        time: time,
    });
}
