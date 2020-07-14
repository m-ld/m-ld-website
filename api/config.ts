import { Config } from '../lib/dto';
import { LOG, randomWord, responder, fetch } from '../lib/api/common';
import nlp from 'compromise';
import { sign } from 'jsonwebtoken';

export default responder<Config.Request, Config.Response>('recaptcha', async configReq => {
  const { domain, genesis } = await newDomain(configReq['@domain']);
  const config: Partial<Config.Response> = {
    '@id': configReq['@id'],
    '@domain': domain,
    genesis,
    logLevel: LOG.getLevel()
  };
  if (!genesis) {
    // Try to load a custom config for this domain
    Object.assign(config, await loadCustomConfig(domain));
  }
  // Tokens are Ably JWTs - used for both our config and Ably's
  config.token = await ablyToken(domain, configReq['@id']);
  config.ably = Object.assign(config.ably ?? {}, { token: config.token });
  config.botName = config.botName ?? await newBotName(configReq.botName);
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
  return new Promise((resolve, reject) => {
    if (process.env.ABLY_KEY == null)
      throw 'Bad lambda configuration';
    const [keyName, secret] = process.env.ABLY_KEY.split(':');
    sign({
      'x-ably-capability': JSON.stringify({ [`${domain}:*`]: ['subscribe', 'publish', 'presence'] }),
      'x-ably-clientId': clientId
    }, secret, {
      keyid: keyName,
      expiresIn: '10m'
    }, (err, token) => err ? reject(err) : resolve(token));
  });
}

/**
 * Get a Bot name if none is specified in the request
 */
async function newBotName(botName: string | null) {
  return botName ?? nlp(await randomWord('proper-noun')).toTitleCase().text();
}
