import { Config } from '../lib/dto';
import { fetch, fetchJson, LOG, PrefixAuth, responder } from '@m-ld/io-web-runtime/dist/lambda';
import { recaptchaV2Auth, recaptchaV3Auth } from '@m-ld/io-web-runtime/dist/server/recaptcha';
import { ablyToken } from '@m-ld/io-web-runtime/dist/server/ably';
import { randomWord } from '@m-ld/io-web-runtime/dist/server/words';

/**
 * Generally timeout in half of the overall lambda timeout, to get early warning of issues
 * @see https://vercel.com/docs/platform/limits
 */
const SERVICE_TIMEOUT = 10000 / 2;

// noinspection JSUnusedGlobalSymbols
export default responder<Config.Request, Config.Response>(new PrefixAuth({
  v2: recaptchaV2Auth, v3: recaptchaV3Auth
}), async configReq => {
  const { domain, genesis } = await newDomain(configReq['@domain']);
  const config: Partial<Config.Response> = {
    '@id': configReq['@id'],
    '@domain': domain,
    genesis,
    logLevel: LOG.getLevel(),
    maxOperationSize: 16 * 1024
  };
  const [customConfig, wrtc, token] = await Promise.all([
    // Try to load a custom config for this domain
    genesis ? undefined : loadCustomConfig(domain),
    // WebRTC config
    getWrtcConfig(),
    // Tokens are Ably JWTs - used for both our config and Ably's
    ablyToken(domain, configReq['@id'])
  ]);
  Object.assign(config, customConfig, { wrtc, token });
  config.ably = Object.assign(config.ably ?? {}, { token: config.token, maxRate: 15 });
  // We're now sure we have everything, even if Typescript isn't
  return <Config.Response>config;
});

/**
 * Load custom config for the domain from https://github.com/m-ld/message-board-demo.
 * Failure-tolerant but will warn if error status is other than Not Found.
 */
async function loadCustomConfig(domain: string): Promise<object> {
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
 * Get a new domain name if none is specified in the request
 */
async function newDomain(domain: string) {
  let genesis = !domain;
  if (!domain) {
    const [part1, part2] = await Promise.all([
      randomWord('adjective'), randomWord('noun')]);
    domain = `${part1}-${part2}.m-ld.org`;
  }
  return { domain, genesis };
}

/**
 * @see https://www.metered.ca/tools/openrelay/
 */
async function getWrtcConfig(): Promise<RTCConfiguration> {
  const apiKey = process.env.METERED_API_KEY;
  return {
    iceServers: await fetchJson<RTCIceServer[]>(
      'https://m-ld.metered.live/api/v1/turn/credentials', { apiKey })
  };
}
