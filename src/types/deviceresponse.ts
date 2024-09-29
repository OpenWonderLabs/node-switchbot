/* Copyright(C) 2017-2024, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * deviceresponse.ts: @switchbot/homebridge-switchbot platform class.
 */
import type { deviceList } from './devicelist.js'
import type { infraredRemoteList } from './irdevicelist.js'

// json response from SwitchBot API
export interface devices {
  statusCode: 100 | 190 | 'n/a'
  message: string
  body: body
}

interface body {
  deviceList: deviceList
  infraredRemoteList: infraredRemoteList
}
