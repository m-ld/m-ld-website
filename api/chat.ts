import { Chat, TopicIndexEntry } from '../lib/dto';
import {
  fetchJson, responder, HttpError, fetchJsonUrl, LOG
} from '@m-ld/io-web-runtime/dist/lambda';
import { NlpBrain } from '../lib/api/NlpBrain';
import { selectRandom } from '../lib/BotBrain';
import { URL } from 'url';
import { ablyJwtAuth } from '../lib/api/authorisations';

const topics: { [origin: string]: TopicIndexEntry[] } = {};

export default responder<Chat.Request, Chat.Response>(ablyJwtAuth, async chatReq => {
  // Load the topics json from the origin, see src/topics.11ty.js
  if (topics[chatReq.origin] == null)
    topics[chatReq.origin] = await fetchJson<TopicIndexEntry[]>(
      new URL('topics.json', chatReq.origin).toString());
  const answer = await new NlpBrain(chatReq.botName, topics[chatReq.origin])
    .respond(chatReq.message, chatReq.topMessages);
  if (answer.message != null)
    answer.message = await fillWords(answer.message);
  return answer;
});

async function fillWords(message: string): Promise<string> {
  if (process.env.WORDNIK_API_KEY == null)
    throw new HttpError(500, 'Bad lambda configuration');
  const api_key = process.env.WORDNIK_API_KEY;
  const regex = /(\w+):(words?.json[\/\w\?=&]+)/g, calls: Promise<string>[] = [];
  message.replace(regex, (_, key, path) => {
    const url = new URL(path, 'http://api.wordnik.com/v4/');
    url.searchParams.append('api_key', api_key);
    calls.push(fetchJsonUrl<any>(url).then(function pick(json): string {
      if (Array.isArray(json))
        return pick(json[0]);
      else if (Array.isArray(json[key]))
        return `${selectRandom(json[key])}`;
      else
        return `${json[key]}`;
    }));
    return '';
  });
  try {
    const results = await Promise.all(calls);
    return message.replace(regex, () => results.shift() ?? '');
  } catch (err) {
    LOG.warn(err);
    return 'erm';
  }
}