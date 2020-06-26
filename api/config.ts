import { NowRequest, NowResponse } from '@now/node'
import { Config } from '../src/_includes/config';
import { LogLevelDesc } from 'loglevel';
import SetupFetch from '@zeit/fetch';
import { FetchOptions } from '@zeit/fetch';
import { URL } from 'url';
const fetch = SetupFetch();

export default async (req: NowRequest, res: NowResponse) => {
  const configReq = req.body as Config.Request;
  if (!configReq.token)
    return res.status(400).send('No token in request!');

  // Validate the token, see https://developers.google.com/recaptcha/docs/v3
  const siteverify = await fetchJson<{ success: boolean, action: string, score: number }>(
    'https://www.google.com/recaptcha/api/siteverify', {
    secret: process.env.RECAPTCHA_SECRET,
    response: configReq.token
  }, { method: 'POST' });

  if (typeof siteverify === 'string')
    return res.status(500).send(`reCAPTCHA failed with ${siteverify}`);

  if (!siteverify.success)
    return res.status(400).send(`reCAPTCHA failed with ${siteverify['error-codes']}`);

  if (siteverify.action != 'config')
    return res.status(400).send(`reCAPTCHA action mismatch, received '${siteverify.action}'`);

  if (siteverify.score < 0.5)
    return res.status(403).send(`reCAPTCHA check failed`);

  // Get a new domain name if none is specified
  let domain = configReq['@domain'];
  let genesis = domain == null;
  if (genesis) {
    const part1 = await fetchWord('adjective'), part2 = await fetchWord('noun');
    if (typeof part1 === 'string' || typeof part2 === 'string')
      return res.status(500).send('Domain name generation failed');

    domain = `${part1.word}-${part2.word}.m-ld.org`;
  }

  // Get an Ably token for the client
  // https://www.ably.io/documentation/rest-api#request-token
  const ablyKey = process.env.ABLY_KEY, keyName = ablyKey.split(':')[0],
    Authorization = `Basic ${Buffer.from(ablyKey).toString('base64')}`;
  const tokenRequest = {
    keyName,
    capability: JSON.stringify({ [`${domain}:*`]: ['subscribe', 'publish', 'presence'] }),
    clientId: configReq['@id'],
    timestamp: Date.now()
  };
  const ably = await fetchJson<{ token: string }>(
    `https://rest.ably.io/keys/${keyName}/requestToken`, {}, {
    method: 'POST',
    headers: { Authorization, 'Content-Type': 'application/json' },
    body: JSON.stringify(tokenRequest)
  });

  if (typeof ably === 'string')
    return res.status(500).send(`Ably token request failed with ${ably}`);

  const config: Config.Response = {
    '@id': configReq['@id'],
    '@domain': domain,
    genesis,
    ably,
    logLevel: process.env.LOG as LogLevelDesc || 'warn'
  }
  res.json(config);
}

async function fetchWord(part: 'noun' | 'adjective') {
  const rtn = await fetchJson<{
    word: string;
  }>('http://api.wordnik.com/v4/words.json/randomWord', {
    api_key: process.env.WORDNIK_API_KEY,
    includePartOfSpeech: part
  });
  return typeof rtn === 'string' ? rtn :
    // Only accept alphabet and hyphen characters
    /^[a-z\-]+$/.test(rtn.word) ? rtn : fetchWord(part);
}

async function fetchJson<T extends object>(
  urlString: string,
  params: { [name: string]: string },
  options: FetchOptions = { method: 'GET' }): Promise<T | string> {
  const url = new URL(urlString);
  Object.entries(params).forEach(([name, value]) => url.searchParams.append(name, value));
  const res = await fetch(url.toString(), options);
  if (res.ok) {
    return (await res.json()) || 'No JSON returned';
  } else {
    console.debug(`Fetch from ${url} failed with ${res.statusText}`);
    return res.statusText;
  }
}
