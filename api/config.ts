import { Config } from '../lib/dto';
import { fetchJson, LOG, randomWord, responder } from '../lib/api/common';
import nlp from 'compromise';

export default responder<Config.Request, Config.Response>(async configReq => {
  const { domain, genesis } = await newDomain(configReq['@domain']);
  return {
    '@id': configReq['@id'],
    '@domain': domain, genesis,
    ably: await ablyConfig(domain, configReq['@id']),
    botName: await newBotName(configReq.botName),
    logLevel: LOG.getLevel()
  }
});

/**
 * Get a new domain name if none is specified in the request
 */
async function newDomain(domain: string | null) {
  let genesis = domain == null;
  if (domain == null) {
    const [part1, part2] = await Promise.all([
      randomWord('adjective'), randomWord('noun')]);
    domain = `${part1}-${part2}.m-ld.org`;
  }
  return { domain, genesis };
}

/**
 * Get an Ably token for the client
 * https://www.ably.io/documentation/rest-api#request-token
 */
async function ablyConfig(domain: string, clientId: string) {
  if (process.env.ABLY_KEY == null)
    throw 'Bad lambda configuration';
  const ablyKey = process.env.ABLY_KEY, keyName = ablyKey.split(':')[0],
    Authorization = `Basic ${Buffer.from(ablyKey).toString('base64')}`;
  return fetchJson<{ token: string; }>(
    `https://rest.ably.io/keys/${keyName}/requestToken`, {}, {
    method: 'POST',
    headers: { Authorization, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      keyName, clientId, timestamp: Date.now(),
      capability: JSON.stringify({ [`${domain}:*`]: ['subscribe', 'publish', 'presence'] }),
    })
  });
}

/**
 * Get a Bot name if none is specified in the request
 */
async function newBotName(botName: string | null) {
  return botName ?? nlp(await randomWord('proper-noun')).toTitleCase().text();
}
