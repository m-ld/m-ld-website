import { Config } from '../lib/dto';
import { LOG, randomWord, responder, fetch, RecaptchaAuth, signJwt } from '@m-ld/io-web-runtime/dist/lambda';
import nlp from 'compromise';

export default responder<Config.Request, Config.Response>(
  new RecaptchaAuth(process.env.RECAPTCHA_SECRET), async configReq => {
    const { domain, genesis } = await newDomain(configReq['@domain']);
    const config: Partial<Config.Response> = {
      '@id': configReq['@id'],
      '@domain': domain,
      genesis,
      logLevel: LOG.getLevel(),
      maxDeltaSize: 16 * 1024,
      wrtc: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478?transport=udp' }
        ]
      }
    };
    if (!genesis) {
      // Try to load a custom config for this domain
      Object.assign(config, await loadCustomConfig(domain));
    }
    // Tokens are Ably JWTs - used for both our config and Ably's
    config.token = await ablyToken(domain, configReq['@id']);
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
 * Get an Ably token for the client
 */
async function ablyToken(domain: string, clientId: string): Promise<string> {
  if (process.env.ABLY_KEY == null)
    throw 'Bad lambda configuration';
  const [keyName, secret] = process.env.ABLY_KEY.split(':');
  return signJwt({
    'x-ably-capability': JSON.stringify({ [`${domain}:*`]: ['subscribe', 'publish', 'presence'] }),
    'x-ably-clientId': clientId
  }, secret, {
    keyid: keyName,
    expiresIn: '10m'
  });
}

/**
 * Get a Bot name if none is specified in the request
 */
async function newBotName() {
  return nlp(await randomWord({
    includePartOfSpeech: 'proper-noun', maxLength: 5
  })).toTitleCase().text();
}
