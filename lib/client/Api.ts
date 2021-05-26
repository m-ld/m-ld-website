import { AuthorisedRequest, Grecaptcha, setLogToken } from '@m-ld/io-web-runtime/dist/client';
import { Config, Renew } from '../dto';
import { uuid } from '@m-ld/m-ld';
import { showGrecaptcha } from './PopupControls';
import * as lifecycle from 'page-lifecycle';

/**
 * @param domain name or empty string to request a new domain
 * @return fetched configuration. This object will occasionally mutate with a
 * new token when it is renewed.
 */
export async function fetchConfig(
  domain: string | ''): Promise<Config.Response> {
  const req: Config.Request =
    authorisedRequest(uuid(), domain, `v3:${await Grecaptcha.execute('config')}`);
  const config: Config.Response = await fetchJson('/api/config', req, async res => {
    if (res.status === 401)
      // Google thinks we're a bot, try interactive reCAPTCHA
      return fetchJson('/api/config', { ...req, token: `v2:${await showGrecaptcha()}` });
  });
  config.ably.token = config.token;
  config.ably.authCallback = async (_, cb) =>
    renewToken(config).then(renewal => {
      setLogToken(renewal.token);
      config.token = renewal.token;
      config.logLevel = renewal.logLevel;
      return cb('', renewal.token);
    }).catch(err => cb(err, ''));
  return config;
}

function renewToken(config: Config.Response): Promise<Renew.Response> {
  const req: Renew.Request = {
    ...authorisedRequest(config['@id'], config['@domain'], `jwt:${config.token}`),
    logLevel: config.logLevel
  };
  return fetchJson('/api/renew', req, async res => {
    // Token renewal failed, possibly due to a period of passivation
    if (res.status === 401 && lifecycle.state === 'active')
      return fetchJson('/api/renew',
        { ...req, token: `recaptcha:${await showGrecaptcha()}` });
  });
}

function authorisedRequest(id: string, domain: string, token: string): AuthorisedRequest {
  return { '@id': id, '@domain': domain, token, origin: window.location.origin };
}

async function fetchJson<Q extends AuthorisedRequest, S>(
  api: string, req: Q, fallback?: (res: Response) => Promise<S | undefined>): Promise<S> {
  const res = await fetch(api, {
    method: 'post',
    headers: { 'Content-type': 'application/json; charset=UTF-8' },
    body: JSON.stringify(req)
  });
  if (!res.ok) {
    if (fallback != null) {
      const fallbackRes = await fallback(res);
      if (fallbackRes != null)
        return fallbackRes;
    }
    throw new Error(res.status + " " + res.statusText);
  }
  return res.json();
}

