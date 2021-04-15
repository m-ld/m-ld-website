import { AuthorisedRequest, Grecaptcha, setLogToken } from '@m-ld/io-web-runtime/dist/client';
import { Chat, Config } from '../dto';
import { uuid } from '@m-ld/m-ld';
import { Answer } from '../BotBrain';
import { showGrecaptcha } from './PopupControls';

/**
 * @param domain name or empty string to request a new domain
 * @param botName current bot name or `false` to request a new bot name, or
 * `undefined` to skip bots
 * @return fetched configuration. This object will occasionally mutate with a
 * new token when it is renewed.
 */
export async function fetchConfig(domain: string | '', botName?: string | false): Promise<Config.Response> {
  const config = await refetchConfig(domain, uuid(), botName);
  config.ably.token = config.token;
  config.ably.authCallback = async (_, cb) =>
    refetchConfig(config['@domain'], config['@id'], config.botName)
      .then(reconfig => {
        setLogToken(reconfig.token);
        config.token = reconfig.token;
        return cb('', reconfig.token);
      })
      .catch(err => cb(err, ''));
  return config;
}

export function fetchAnswer(config: Config.Response, message: string, topMessages: string[]): Promise<Answer> {
  if (!config.botName)
    return Promise.reject('No bot present');
  return fetchJson<Chat.Request, Chat.Response>('/api/chat', {
    '@id': config['@id'], '@domain': config['@domain'],
    origin: window.location.origin, token: config.token,
    message, topMessages, botName: config.botName
  });
}

async function refetchConfig(domain: string | '', id: string, botName?: string | false) {
  const token = await Grecaptcha.execute('config');
  const req = {
    origin: window.location.origin,
    '@id': id, '@domain': domain, token, botName
  };
  const res = await fetchWithJson<Config.Request>('/api/config', req);
  if (res.status === 403) {
    const v2Token = await showGrecaptcha();
    return fetchJson<Config.Request, Config.Response>('/api/config', {
      ...req, token: `v2:${v2Token}`
    });
  } else if (!res.ok) {
    throw new Error(res.status + " " + res.statusText);
  } else {
    return (await res.json()) as Config.Response;
  }
}

async function fetchJson<Q extends AuthorisedRequest, S>(api: string, req: Q): Promise<S> {
  const res = await fetchWithJson<Q>(api, req);
  if (!res.ok)
    throw new Error(res.status + " " + res.statusText);
  return res.json();
}

function fetchWithJson<Q extends AuthorisedRequest>(api: string, req: Q) {
  return fetch(api, {
    method: 'post',
    headers: { 'Content-type': 'application/json; charset=UTF-8' },
    body: JSON.stringify(req)
  });
}

