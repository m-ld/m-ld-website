import { NowRequest, NowResponse } from '@now/node'
import { Config } from '../src/_includes/config';
import SetupFetch from '@zeit/fetch';
import { Response } from 'node-fetch';
import { URL } from 'url';
const fetch = SetupFetch();

export default async (req: NowRequest, res: NowResponse) => {
  const configReq = req.body as Config.Request;
  if (!configReq.token)
    return res.status(400).send('No token in request!');

  // Validate the token, see https://developers.google.com/recaptcha/docs/v3
  const siteverify = await fetchJson<{ success: boolean, action: string }>(
    'https://www.google.com/recaptcha/api/siteverify', {
    secret: process.env.RECAPTCHA_SECRET,
    response: configReq.token
  }, 'POST');

  if (typeof siteverify === 'string')
    return res.status(500).send(`reCAPTCHA failed with ${siteverify}`);

  if (!siteverify.success)
    return res.status(400).send(`reCAPTCHA failed with ${siteverify['error-codes']}`);

  if (siteverify.action != 'config')
    return res.status(400).send(`reCAPTCHA action mismatch, received '${siteverify.action}'`);

  console.log(`reCAPTCHA: ${JSON.stringify(siteverify)}`);

  // Get a new domain name if none is specified
  console.log(process.env.RECAPTCHA_SECRET);
  let domain = configReq['@domain'];
  if (!domain) {
    const part1 = await fetchWord('adjective'), part2 = await fetchWord('noun');
    if (typeof part1 === 'string' || typeof part2 === 'string')
      return res.status(500).send('Domain name generation failed');

    domain = `${part1.word}-${part2.word}.m-ld.org`;
  }

  // TODO Get a new broker username if required

  res.json({
    '@domain': domain,
    mqttOpts: {
      host: 'localhost',
      port: 8888,
      protocol: 'ws'
    }
  } as Config.Response);
}

async function fetchWord(part: 'noun' | 'adjective') {
  return await fetchJson<{
    word: string;
  }>('http://api.wordnik.com/v4/words.json/randomWord', {
    api_key: process.env.WORDNIK_API_KEY,
    includePartOfSpeech: part
  });
}

async function fetchJson<T extends object>(url: string, params: { [name: string]: string }, method: string = 'GET'): Promise<T | string> {
  const req: { url: URL, res?: Response, json?: any } = { url: new URL(url) };
  Object.entries(params).forEach(([name, value]) => req.url.searchParams.append(name, value));
  req.res = await fetch(req.url.toString(), { method });
  if (req.res.status !== 200) {
    console.debug(`Fetch from ${url} failed with ${req.res.statusText}`);
    return req.res.statusText;
  } else {
    req.json = await req.res.json();
    return req.json || 'No JSON returned';
  }
}
