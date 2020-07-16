import { responder } from '../lib/api/common';
import { Log } from '../lib/dto';

export default responder<Log.Request, Log.Response>('jwt', async (logReq, remoteLog) => {
  logReq.logs.forEach(log => remoteLog.log(log));
});