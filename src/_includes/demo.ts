import { BoardView } from '../../lib/client/BoardView';
import { Message } from '../../lib/Message';
// import * as Level from 'level-js';
import MemDown from 'memdown';
import { clone, shortId, uuid } from '@m-ld/m-ld';
import { Config, Chat, AuthorisedRequest, ID_HEADER, DOMAIN_HEADER } from '../../lib/dto';
import * as d3 from 'd3';
import { BoardLocal } from '../../lib/client/BoardLocal'
import {
  showError, showCantDemo, initControls, showWarning
} from '../../lib/client/BoardControls';
import { AblyRemotes } from '@m-ld/m-ld/dist/ably';
import { BoardBot } from '../../lib/BoardBot';
import * as LOG from 'loglevel';
import * as remoteLog from 'loglevel-plugin-remote';

window.onload = function () {
  Modernizr.on('indexeddb', () => {
    const missing = Object.keys(Modernizr).filter(
      (key: keyof ModernizrStatic) => !Modernizr[key]);
    if (missing.length)
      showCantDemo(missing);
    else
      grecaptcha.ready(start);
  });

  const local = new BoardLocal();
  initControls(local);

  async function start() {
    try {
      let domain: string = document.location.hash.slice(1) ?? '';
      if (domain === 'new' || (!domain && !local.domains.length)) {
        // Create a new domain
        domain = '';
      } else if (!domain) {
        // Return to the last domain visited
        domain = local.domains[0];
      }

      // Get the configuration for the domain
      const config = await fetchConfig(domain, uuid());
      config.ably.token = config.token;
      config.ably.authCallback = async (_, cb) =>
        fetchConfig(config['@domain'], config['@id'])
          .then(reconfig => {
            remoteLog.setToken(reconfig.token);
            config.token = reconfig.token;
            return cb('', reconfig.token);
          })
          .catch(err => cb(err, ''));
      domain = config['@domain'];
      configureLogging(config);
      const botName = config.botName;
      local.setBotName(domain, botName);
      history.replaceState(null, '', '#' + domain);

      // Initialise the m-ld clone
      const meld = await clone(new MemDown, AblyRemotes, config);
      window.addEventListener('unload', () => meld.close());

      // Wait for the latest state from the clone
      // (Remove this line to see rev-ups as they happen)
      await meld.status.becomes({ outdated: false });

      // When the clone goes offline, show a suitable warning
      const statusSub = meld.status.subscribe(status => {
        if (!status.online) {
          showWarning('It looks like this browser is offline. ' +
            'You can keep working, but don\'t refresh the page.');
          meld.status.becomes({ online: true })
            .then(() => showWarning('Back online!'));
        }
      });
      window.addEventListener('beforeunload', () => statusSub.unsubscribe());

      // Add the domain to the local list of domains
      local.addDomain(domain);

      // Unshow the loading progress
      d3.select('#loading').classed('is-active', false);
      d3.select('#board-href').text(window.location.href);

      // The welcome message uses the id of the domain - it can't be deleted
      const welcomeId = shortId(domain);

      // Create the board UI View
      const boardView = new BoardView('#board', meld, welcomeId);

      // Add the welcome message if not already there
      const isNew = (await meld.get(welcomeId)) == null;
      if (isNew) {
        await meld.transact<Message>({
          '@id': welcomeId,
          '@type': 'Message',
          text: `Welcome to ${domain}!`,
          x: 200, y: 100,
          linkTo: []
        });
      }

      // Unleash the board's resident bot
      if (botName)
        await new BoardBot(botName, welcomeId, meld, boardView.index, {
          respond: async (message: string, topMessages: string[]) =>
            (await fetch<Chat.Request, Chat.Response>('/api/chat', {
              '@id': config['@id'], '@domain': domain,
              origin: window.location.origin, token: config.token,
              message, topMessages, botName
            }))
      }).start(isNew);
    } catch (err) {
      showError(err);
    }

    async function fetchConfig(domain: string | '', id: string) {
      const site = process.env.RECAPTCHA_SITE;
      if (site == null)
        throw new Error('Bad configuration: reCAPTCHA site missing');
      const token = await grecaptcha.execute(site, { action: 'config' });
      return await fetch<Config.Request, Config.Response>('/api/config', {
        origin: window.location.origin,
        '@id': id, '@domain': domain, token, botName: local.getBotName(domain)
      });
    }
  }
}
window.onhashchange = function () {
  location.reload();
};

function configureLogging(config: Config.Response) {
  if (config.logLevel != null)
    LOG.setLevel(config.logLevel);
  remoteLog.apply(LOG, {
    url: '/api/log',
    token: config.token,
    headers: {
      [ID_HEADER]: config['@id'],
      [DOMAIN_HEADER]: config['@domain']
    },
    format: remoteLog.json
  });
}

async function fetch<Q extends AuthorisedRequest, S>(api: string, req: Q): Promise<S> {
  return await d3.json(api, {
    method: 'post',
    headers: { 'Content-type': 'application/json; charset=UTF-8' },
    body: JSON.stringify(req)
  }) as S;
}

