import { responder, Log, JwtAuth } from '@m-ld/io-web-runtime/dist/lambda';

export default responder<Log.Request, Log.Response>(
  new JwtAuth(process.env.ABLY_KEY?.split(':')[1]), async (logReq, remoteLog) => {
    logReq.logs.forEach(log => remoteLog.log(log));
  });