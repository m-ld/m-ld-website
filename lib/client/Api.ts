import { AuthorisedRequest, Grecaptcha, setLogToken } from '@m-ld/io-web-runtime/dist/client';
import { Config, Renew } from '../dto';
import { uuid } from '@m-ld/m-ld';
import { showGrecaptcha } from './PopupControls';
import * as lifecycle from 'page-lifecycle';

/**
 * @param domain name or empty string to request a new domain
 * @param gateway if omitted, Ably will be used
 * @return fetched configuration. This object will occasionally mutate with a
 * new token when it is renewed.
 */
export async function fetchConfig(
  domain: string | '', gateway?: Config.GatewayOptions): Promise<Config.Response> {
  const token = `v3:${await Grecaptcha.execute('config')}`;
  const req: Config.Request = {
    ...authorisedRequest(uuid(), domain, token),
    gateway
  };
  const config: Config.Response = await fetchApiJson('config', req, async res => {
    if (res.status === 401)
      // Google thinks we're a bot, try interactive reCAPTCHA
      return fetchApiJson('config', { ...req, token: `v2:${await showGrecaptcha()}` });
  });
  if ('ably' in config) {
    config.ably.token = config.token;
    config.ably.authCallback = async (_, cb) =>
      renewToken(config).then(renewal => {
        setLogToken(renewal.token);
        config.token = renewal.token;
        config.logLevel = renewal.logLevel;
        return cb('', renewal.token);
      }).catch(err => cb(err, ''));
  }
  return config;
}

function renewToken(config: Config.Response): Promise<Renew.Response> {
  const req: Renew.Request = {
    ...authorisedRequest(config['@id'], config['@domain'], `jwt:${config.token}`),
    logLevel: config.logLevel
  };
  return fetchApiJson('renew', req, async res => {
    // Token renewal failed, possibly due to a period of passivation
    if (res.status === 401 && lifecycle.state === 'active')
      return fetchApiJson('renew',
        { ...req, token: `recaptcha:${await showGrecaptcha()}` });
  });
}

function authorisedRequest(id: string, domain: string, token: string): AuthorisedRequest {
  return { '@id': id, '@domain': domain, token, origin: window.location.origin };
}

async function fetchApiJson<Q extends AuthorisedRequest, S>(
  api: 'config' | 'renew',
  req: Q,
  fallback?: (res: Response) => Promise<S | undefined>
): Promise<S> {
  const res = await fetch(`/api/${api}`, {
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
    // Try to get the cause of the error from the body
    throw new Error(await res.text().catch(() => res.statusText));
  }
  return res.json();
}

