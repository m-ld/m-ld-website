import { Config } from '../lib/dto';
import {
  LOG, randomWord, responder, fetch, fetchJsonUrl
} from '@m-ld/io-web-runtime/dist/lambda';
import nlp from 'compromise';
import { ablyToken, PrefixAuth, recaptchaV2Auth, recaptchaV3Auth } from '../lib/api/authorisations';

export default responder<Config.Request, Config.Response>(new PrefixAuth({
  v2: recaptchaV2Auth, v3: recaptchaV3Auth
}), async configReq => {
  const { domain, genesis } = await newDomain(configReq['@domain']);
  const config: Partial<Config.Response> = {
    '@id': configReq['@id'],
    '@domain': domain,
    genesis,
    logLevel: LOG.getLevel(),
    maxDeltaSize: 16 * 1024
  };
  const [customConfig, wrtc, token] = await Promise.all([
    // Try to load a custom config for this domain
    genesis ? undefined : loadCustomConfig(domain),
    // Load WebRTC config
    loadWrtcConfig(),
    // Tokens are Ably JWTs - used for both our config and Ably's
    ablyToken(domain, configReq['@id'])
  ]);
  Object.assign(config, customConfig, { wrtc, token });
  config.ably = Object.assign(config.ably ?? {}, { token: config.token, maxRate: 15 });
  // Check if bot is explicitly disabled in the custom config
  if (config.botName !== false && configReq.botName != null) {
    // Bot name is browser-specific, so just look for truthiness
    if (config.botName != null) // Every browser has a bot!
      config.botName = configReq.botName || await newBotName();
    else // New bot if genesis, otherwise keep whatever we had before
      config.botName = genesis ? await newBotName() : configReq.botName;
  }
  // We're now sure we have everything, even if Typescript isn't
  return <Config.Response>config;
});

/** @see https://docs.xirsys.com/?pg=api-turn */
async function loadWrtcConfig() {
  const auth = `${process.env.XIRSYS_IDENT}:${process.env.XIRSYS_SECRET}`;
  const channel = process.env.XIRSYS_CHANNEL;
  const body = JSON.stringify({ format: 'urls' });
  const res = await fetchJsonUrl<{ v: string, s: 'error' } | { v: RTCConfiguration, s: 'ok' }>(
    new URL(`https://global.xirsys.net/_turn/${channel}`), {
    method: 'PUT',
    headers: {
      'Authorization': `Basic ${Buffer.from(auth).toString('base64')}`,
      'Content-Type': 'application/json',
      'Content-Length': `${body.length}`
    },
    body
  });
  if (res.s !== 'ok')
    throw res.v;
  return { ...res.v, iceServers: fixIceServers(res.v.iceServers) };
}

/** BUG in Xirsys outputs single server without array wrapper */
function fixIceServers(iceServers?: RTCIceServer[] | RTCIceServer): RTCIceServer[] | undefined {
  if (iceServers != null) {
    if (!Array.isArray(iceServers))
      iceServers = [iceServers];
    iceServers.forEach(iceServer => {
      if (Array.isArray(iceServer.urls)) {
        const parsed = iceServer.urls.map(parseIceServerUrl);
        iceServer.urls = [
          removeFirst(parsed, ice => ice.protocol === 'stun'),
          removeFirst(parsed, ice => ice.protocol === 'turn' && ice.transport === 'udp'),
          removeFirst(parsed, ice => ice.protocol === 'turn' && ice.transport === 'tcp'),
          ...parsed
        ].map(ice => ice?.url).filter((url?: string): url is string => url != null).slice(0, 3);
      }
    });
    return iceServers;
  }
}

function removeFirst<T>(array: T[], predicate: (t: T) => boolean): T | undefined {
  const index = array.findIndex(predicate);
  if (index > -1)
    return array.splice(index, 1)[0];
}

function parseIceServerUrl(url: string): {
  url: string, protocol?: string, port?: string, transport?: string
} {
  const match = url.match(/^(stun|turn|turns):[\w-\.]+(?::(\d+))?(?:\?transport=(tcp|udp))?/);
  if (match != null) {
    const [url, protocol, port, transport] = match;
    return { url, protocol, port, transport };
  } else {
    return { url };
  }
}

/**
 * Load custom config for the domain from https://github.com/m-ld/message-board-demo.
 * Failure-tolerant but will warn if error status is other than Not Found.
 */
async function loadCustomConfig(domain: string): Promise<object> {
  const res = await fetch(
    `https://raw.githubusercontent.com/m-ld/message-board-demo/master/config/${domain}.json`);
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
 * Get a Bot name if none is specified in the request
 */
async function newBotName() {
  return nlp(await randomWord({
    includePartOfSpeech: 'proper-noun', maxLength: 5
  })).toTitleCase().text();
}
