import { responder, Log } from '@m-ld/io-web-runtime/dist/lambda';
import { ablyJwtAuth } from '../lib/api/authorisations';

export default responder<Log.Request, Log.Response>(
  ablyJwtAuth, async (logReq, remoteLog) => {
    logReq.logs.forEach(log => remoteLog.log(log));
  });