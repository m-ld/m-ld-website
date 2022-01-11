import { Log, responder } from '@m-ld/io-web-runtime/dist/lambda';
import { ablyJwtAuth } from '@m-ld/io-web-runtime/dist/server/ably';

export default responder<Log.Request, Log.Response>(
  ablyJwtAuth, async (logReq, remoteLog) => {
    logReq.logs.forEach(log => remoteLog.log(log));
  });