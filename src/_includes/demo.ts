import { BoardView } from '../../lib/client/BoardView';
import { Message } from '../../lib/Message';
import * as Level from 'level-js';
import { clone, shortId, uuid } from '@m-ld/m-ld';
import { Config, Chat } from '../../lib/dto';
import * as d3 from 'd3';
import {
  showError, showCantDemo, getLocalDomains, addLocalDomain, initControls,
  showWarning, getLocalBotName, setLocalBotName
} from '../../lib/client/BoardControls';
import { AblyRemotes } from '@m-ld/m-ld/dist/ably';
import { BoardBot } from '../../lib/BoardBot';

window.onload = function () {
  Modernizr.on('indexeddb', () => {
    const missing = Object.keys(Modernizr).filter(
      (key: keyof ModernizrStatic) => !Modernizr[key]);
    if (missing.length)
      showCantDemo(missing);
    else
      grecaptcha.ready(start);
  });

  initControls();

  async function start() {
    try {
      let domain: string | null = document.location.hash.slice(1);
      const localDomains = getLocalDomains();
      if (domain === 'new' || (!domain && !localDomains.length)) {
        // Create a new domain
        domain = null;
      } else if (!domain) {
        // Return to the last domain visited
        domain = localDomains[0];
      }

      // Get the configuration for the domain
      const config = await fetchConfig(domain, uuid());
      config.ably.authCallback = async (_, cb) =>
        fetchConfig(config['@domain'], config['@id'])
          .then(reconfig => cb('', reconfig.ably.token))
          .catch(err => cb(err, ''));
      domain = config['@domain'];
      setLocalBotName(config.botName);
      history.replaceState(null, '', '#' + domain);

      // Initialise the m-ld clone
      const meld = await clone(Level(domain), AblyRemotes, config);
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
      addLocalDomain(domain);

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
      await new BoardBot(config.botName, welcomeId, meld, boardView.index, {
        answer: async (message: string, topMessages: string[]) =>
          (await fetch<Chat.Request, Chat.Response>('/api/chat', (token: string) => ({
            origin: window.location.origin,
            token, message, topMessages, botName: config.botName
          }))).message
      }).start(isNew);
    } catch (err) {
      showError(err);
    }

    async function fetchConfig(domain: string | null, id: string) {
      return await fetch<Config.Request, Config.Response>('/api/config', (token: string) => ({
        origin: window.location.origin,
        '@id': id, '@domain': domain, token, botName: getLocalBotName()
      }));
    }

    async function fetch<Q, S>(api: string, req: (token: string) => Q): Promise<S> {
      const site = process.env.RECAPTCHA_SITE;
      if (site == null)
        throw new Error('Bad configuration: reCAPTCHA site missing');
      const token = await grecaptcha.execute(site, { action: 'config' });
      return await d3.json(api, {
        method: 'post',
        headers: { 'Content-type': 'application/json; charset=UTF-8' },
        body: JSON.stringify(req(token) as Q)
      }) as S;
    }
  }
}
window.onhashchange = function () {
  location.reload();
};

