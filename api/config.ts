import { Config } from '../lib/dto';
import {
  fetch, fetchJson, fetchJsonUrl, HttpError, LOG, PrefixAuth, responder
} from '@m-ld/io-web-runtime/dist/lambda';
import { recaptchaV2Auth, recaptchaV3Auth } from '@m-ld/io-web-runtime/dist/server/recaptcha';
import { ablyToken } from '@m-ld/io-web-runtime/dist/server/ably';
import { randomWord } from '@m-ld/io-web-runtime/dist/server/words';
import { MeldIoConfig } from '@m-ld/m-ld/ext/socket.io/index';
import { MeldAblyConfig } from '@m-ld/m-ld/ext/ably/index';

/**
 * Generally timeout in half of the overall lambda timeout, to get early warning of issues
 * @see https://vercel.com/docs/platform/limits
 */
const SERVICE_TIMEOUT = 10000 / 2;

// noinspection JSUnusedGlobalSymbols
export default responder<Config.Request, Config.Response>(new PrefixAuth({
  v2: recaptchaV2Auth, v3: recaptchaV3Auth
}), async configReq => {
  const { '@id': id, '@domain': domain, gateway } = configReq;
  // Anything that is xxx.m-ld.org defaults to use Ably
  // The 'use' flag applies to new (blank) domain
  const config = /^[^.]+\.m-ld\.org$/.test(domain) || (!domain && !gateway?.use) ?
    await getAblyConfig(domain) :
    await getGatewayConfig(domain, gateway);
  return {
    '@id': id,
    ...config,
    // Tokens are Ably JWTs - used for both our config and Ably's
    token: await ablyToken(config['@domain'], id),
    logLevel: LOG.getLevel()
  };
});

async function getGatewayConfig(
  domain: string | '',
  gateway: Config.GatewayOptions | undefined
): Promise<MeldIoConfig> {
  const domainParts = domain.split('.');
  domainParts[1] ||= gateway?.user ?? 'public';
  let [name, account, ...gwDomain] = domainParts; // Name may be falsy
  if (gwDomain.length < 2 && gateway == null)
    throw new HttpError(400, 'No gateway specified');
  const root = getGatewayRoot(gwDomain.join('.') || gateway!.origin);
  const headers: Record<string, string> = {};
  if (gateway?.key)
    headers['Authorization'] =
      `Basic ${Buffer.from(gateway.user + ':' + gateway.key).toString('base64')}`;
  if (name)
    headers['Content-Type'] = 'application/json';
  const config = await fetchJsonUrl<MeldIoConfig>(
    new URL(`/api/v1/domain/${account}`, root),
    {
      method: 'POST',
      body: name ? JSON.stringify({ name }) : undefined,
      headers
    }
  );
  // If auth is required, add in the provided keys
  const auth = config.io?.opts?.auth;
  if (typeof auth == 'object') {
    if (gateway == null)
      throw new HttpError(400, 'Gateway authentication required');
    auth.user = gateway.user;
    auth.key = gateway.key;
  }
  return config;
}

async function getAblyConfig(domain: string | '') {
  const genesis = !domain;
  // Get a new domain name if none is specified in the request
  if (!domain) {
    const [part1, part2] = await Promise.all([
      randomWord('adjective'), randomWord('noun')]);
    domain = `${part1}-${part2}.m-ld.org`;
  }
  const [customConfig, wrtc] = await Promise.all([
    // Try to load a custom config for this domain
    genesis ? undefined : loadCustomConfig(domain),
    // WebRTC config
    getWrtcConfig(),
  ]);
  return {
    '@domain': domain,
    genesis,
    ...customConfig,
    ably: { ...customConfig?.ably, maxRate: 15 },
    wrtc,
    maxOperationSize: 16 * 1024
  };
}

/**
 * Load custom config for the domain from https://github.com/m-ld/message-board-demo.
 * Failure-tolerant but will warn if error status is other than Not Found.
 */
async function loadCustomConfig(domain: string): Promise<Partial<MeldAblyConfig>> {
  const res = await fetch(
    `https://raw.githubusercontent.com/m-ld/message-board-demo/master/config/${domain}.json`,
    { timeout: SERVICE_TIMEOUT });
  if (res.ok)
    return res.json();
  else if (res.status !== 404)
    LOG.warn(`Fetch config failed with ${res.status}: ${res.statusText}`);
  return {};
}

/**
 * @see https://www.metered.ca/tools/openrelay/
 */
async function getWrtcConfig(): Promise<RTCConfiguration> {
  // noinspection JSUnresolvedReference
  const apiKey = process.env.METERED_API_KEY;
  return {
    iceServers: await fetchJson<RTCIceServer[]>(
      'https://m-ld.metered.live/api/v1/turn/credentials', { apiKey })
  };
}

function getGatewayRoot(origin: string) {
  try {
    return new URL(/^https?:\/\//.test(origin) ?
      origin : `https://${origin}`);
  } catch (e) {
    throw new HttpError(400, `Bad origin: ${e}`);
  }
}
