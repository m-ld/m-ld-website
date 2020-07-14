import { Config } from '../lib/dto';
import { LOG, randomWord, responder } from '../lib/api/common';
import nlp from 'compromise';
import { sign } from 'jsonwebtoken';

export default responder<Config.Request, Config.Response>('recaptcha', async configReq => {
  const { domain, genesis } = await newDomain(configReq['@domain']);
  // Tokens are Ably JWTs
  const token = await ablyToken(domain, configReq['@id']);
  return {
    '@id': configReq['@id'],
    '@domain': domain, genesis,
    ably: { token }, token,
    botName: await newBotName(configReq.botName),
    logLevel: LOG.getLevel()
  }
});

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
    }, (err, token) => err ? reject(err): resolve(token));
  });
}

/**
 * Get a Bot name if none is specified in the request
 */
async function newBotName(botName: string | null) {
  return botName ?? nlp(await randomWord('proper-noun')).toTitleCase().text();
}
