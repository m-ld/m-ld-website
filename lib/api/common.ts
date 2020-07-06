import { NowResponse, NowRequest } from '@now/node'
import { AuthorisedRequest } from '../dto';
import { LogLevelDesc } from 'loglevel';
import * as LOG from 'loglevel';
import SetupFetch from '@zeit/fetch';
import { FetchOptions } from '@zeit/fetch';
import { URL } from 'url';
import nlp from 'compromise';
const fetch = SetupFetch();

LOG.setLevel(process.env.LOG as LogLevelDesc || 'warn');
export { LOG, nlp };
  
/**
 * Within a responder handler, internal server errors such as from a third-party
 * service can be just strings.
 */
export function responder<Q extends AuthorisedRequest, R>(handler: (q: Q) => Promise<R>) {
  return async (req: NowRequest, res: NowResponse) => {
    try {
      const jsonReq = req.body as Q; // TODO: Request validation
      await authorise(jsonReq);
      res.json(await handler(jsonReq));
    } catch (err) {
      HttpError.respond(res, err);
    }
  }
}
  
async function authorise(req: AuthorisedRequest): Promise<void> {
  if (process.env.RECAPTCHA_SECRET == null)
    throw 'Bad lambda configuration';

  if (!req.token)
    throw new HttpError(400, 'No token in request!');
  
  // Validate the token, see https://developers.google.com/recaptcha/docs/v3
  const siteverify = await fetchJson<{
    success: boolean, action: string, score: number, 'error-codes': string[]
  }>(
    'https://www.google.com/recaptcha/api/siteverify', {
    secret: process.env.RECAPTCHA_SECRET,
    response: req.token
  }, { method: 'POST' });

  if (typeof siteverify === 'string')
    throw `reCAPTCHA failed with ${siteverify}`;

  if (!siteverify.success)
    throw `reCAPTCHA failed with ${siteverify['error-codes']}`;

  if (siteverify.action != 'config')
    throw new HttpError(403, `reCAPTCHA action mismatch, received '${siteverify.action}'`);

  if (siteverify.score < 0.5)
    throw new HttpError(403, `reCAPTCHA check failed`);
}

export class HttpError {
  constructor(
    private readonly statusCode: number,
    private readonly statusMessage: string) {
  }

  respond(res: NowResponse): NowResponse {
    if (this.statusCode >= 500) {
      LOG.warn(this);
      return res.status(500).send('Internal server error');
    } else {
      return res.status(this.statusCode).send(this.statusMessage);
    }
  }

  static respond(res: NowResponse, err: any): NowResponse {
    const httpError = err instanceof HttpError ? err : new HttpError(500, `${err}`);
    return httpError.respond(res);
  }
}

export async function fetchJson<T extends object>(
  urlString: string,
  params: object = {},
  options: FetchOptions = { method: 'GET' }): Promise<T> {
  const url = new URL(urlString);
  Object.entries(params).forEach(([name, value]) =>
    url.searchParams.append(name, `${value}`));
  const res = await fetch(url.toString(), options);
  if (res.ok) {
    const json = await res.json();
    if (json == null)
      throw `No JSON returned from ${url}`;
    return json;
  } else {
    throw `Fetch from ${url} failed with ${res.statusText}`
  }
}

type PartOfSpeech = 'noun' | 'adjective' | 'proper-noun';

export interface WordParams {
  includePartOfSpeech: PartOfSpeech;
  maxLength?: number;
}

export async function randomWord(params: WordParams | PartOfSpeech): Promise<string> {
  if (process.env.WORDNIK_API_KEY == null)
    throw new HttpError(500, 'Bad lambda configuration');
  if (typeof params == 'string')
    params = { includePartOfSpeech: params };
  const rtn = await fetchJson<{ word: string; }>(
    'http://api.wordnik.com/v4/words.json/randomWord', {
    api_key: process.env.WORDNIK_API_KEY,
      ...params
  });
  // Only accept alphabet and hyphen characters
  return /^[a-z\-]+$/.test(rtn.word) ? rtn.word : randomWord(params);
}
