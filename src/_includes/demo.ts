import { BoardView } from './lib/BoardView';
import { Message } from './lib/Message';
import * as Level from 'level-js';
import { clone, Update, shortId, uuid } from '@m-ld/m-ld';
import { Config } from './config';
import * as d3 from 'd3';
import { showError, showCantDemo, getLocalDomains, addLocalDomain, initControls } from './lib/BoardControls';
import { MqttRemotes } from '@m-ld/m-ld/dist/mqtt';

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
      const token = await grecaptcha.execute(process.env.RECAPTCHA_SITE, { action: 'config' });

      let domain = document.location.hash.slice(1);
      const localDomains = getLocalDomains();
      if (domain === 'new' || (!domain && !localDomains.length)) {
        // Create a new domain
        domain = null;
      } else if (!domain) {
        // Return to the last domain visited
        domain = localDomains[0];
      }

      // Get the configuration for the domain
      const config = await d3.json('/api/config', {
        method: 'post',
        headers: { 'Content-type': 'application/json; charset=UTF-8' },
        body: JSON.stringify({
          '@id': uuid(), '@domain': domain, token
        } as Config.Request)
      }) as Config.Response;
      domain = config['@domain'];
      history.replaceState(null, null, '#' + domain);

      // Initialise the m-ld clone
      const meld = await clone(Level(domain), new MqttRemotes(config), config);
      window.addEventListener('unload', () => meld.close());

      // Wait for the latest state from the clone
      // (Remove this line to see rev-ups as they happen)
      await meld.latest();

      // Add the domain to the local list of domains
      addLocalDomain(domain);

      // Unshow the loading progress
      d3.select('#loading').classed('is-active', false);

      // The welcome message uses the id of the domain - it can't be deleted
      const welcomeId = shortId(domain);

      // Create the board UI View
      new BoardView('#board', meld, welcomeId);

      // Check if we've already said Hello
      const welcome = await meld.get(welcomeId).toPromise();
      if (!welcome) {
        meld.transact({
          '@id': welcomeId,
          '@type': 'Message',
          text: `Welcome to ${domain}!`,
          x: 200, y: 100,
          linkTo: []
        } as Message);

        await new Promise(res => setTimeout(res, 2000));

        meld.transact({
          '@insert': [{
            '@id': 'thisIs',
            '@type': 'Message',
            text: 'This is your new collaborative message board.',
            x: 250, y: 200,
            linkTo: []
          } as Message, {
            '@id': welcomeId, linkTo: [{ '@id': 'thisIs' }]
          } as Partial<Message>]
        } as Update);

        await new Promise(res => setTimeout(res, 2000));

        meld.transact({
          '@insert': [{
            '@id': 'weUse',
            '@type': 'Message',
            text: "We'll use it to demonstrate how m-ld works.",
            x: 300, y: 300,
            linkTo: []
          } as Message, {
            '@id': 'thisIs', linkTo: [{ '@id': 'weUse' }]
          } as Partial<Message>]
        } as Update);
      }
    } catch (err) {
      showError(err);
    }
  }
}
window.onhashchange = function () {
  location.reload();
};

