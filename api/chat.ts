import { Chat } from '../lib/dto';
import { nlp, randomWord, responder } from '../lib/api/common';

export default responder<Chat.Request, Chat.Response>(async chatReq => {
  return {
    message: await randomWord('noun')
  }
});
