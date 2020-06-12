import { BoardView, showWarning } from './lib/BoardView';
import { Message } from './lib/Message';
import * as Level from 'level-js';
import { clone, Update, shortId } from '@m-ld/m-ld';
import { Config } from './config';
import * as d3 from 'd3';
import * as local from 'local-storage';

window.onload = function () {
  grecaptcha.ready(async () => {
    try {
      const token = await grecaptcha.execute(process.env.RECAPTCHA_SITE, { action: 'config' });

      let domain = document.location.hash.slice(1);
      let localDomains = local.get<string[]>('m-ld.domains') ?? [];
      if (domain === 'new' || (!domain && !localDomains.length)) {
        // Create a new domain
        domain = null;
      } else if (!domain) {
        // Return to the last domain visited
        domain = localDomains[0];
      }

      // Get the configuration for the domain
      const meldConfig = await d3.json('/api/config', {
        method: 'post',
        headers: { 'Content-type': 'application/json; charset=UTF-8' },
        body: JSON.stringify({
          '@domain': domain, token
        } as Config.Request)
      }) as Config.Response;
      domain = meldConfig['@domain'];
      history.replaceState(null, null, '#' + domain);

      // Initialise the m-ld clone
      const meld = await clone(Level(domain), meldConfig);
      window.addEventListener('unload', () => meld.close());

      // Wait for the latest state from the clone
      // (Remove this line to see rev-ups as they happen)
      await meld.latest();

      // Add the domain to the local list of domains
      localDomains = localDomains.filter(d => d !== domain);
      localDomains.unshift(domain);
      local.set<string[]>('m-ld.domains', localDomains);

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
  });
  // Warning notification delete button
  d3.select('#warning .delete').on('click', function (this: Element) {
    d3.select('#warning').classed('is-hidden', true);
  });
  function pickBoard(domain: string) {
    location.hash = domain;
  }
  // Board picker dropdown
  const boardPicker = d3.select('#board-picker');
  d3.select('#board-picker button')
    .on('click', () => {
      const show = !boardPicker.classed('is-active');
      if (show)
        updateBoardPicks();
      boardPicker.classed('is-active', show);
    })
    .on('blur', () => d3.select('#board-picker').classed('is-active', false));
  d3.select('#new-board').on('mousedown', () => pickBoard('new'));

  function showError(err: any) {
    d3.select('#error')
      .classed('is-active', true)
      .select('.error-text').text(`${err}`);
  }

  function updateBoardPicks() {
    const localDomains = local.get<string[]>('m-ld.domains') ?? [];
    const boardPicks = boardPicker.select('#boards')
      .selectAll('.pick-board').data(localDomains)
      .join('tr').classed('pick-board', true)
      .html(''); // Remove previous content
    boardPicks
      .append('td').append('a').classed('dropdown-item', true)
      .classed('is-active', (_, i) => i == 0)
      .text(domain => domain)
      .on('mousedown', pickBoard);
    boardPicks.filter((_, i) => i > 0)
      .append('td').append('a').classed('tag is-delete is-danger', true)
      .attr('title', 'Remove this board')
      .on('mousedown', deleteDomain);
  }

  function deleteDomain(domain: string) {
    const localDomains = local.get<string[]>('m-ld.domains') ?? [];
    // Level typing is wrong - destroy is a static method
    (<any>Level).destroy(domain, (err: any) => {
      if (err) {
        showError(err);
      } else {
        local.set<string[]>('m-ld.domains', localDomains.filter(d => d !== domain));
        showWarning(`Board ${domain} has been removed from this browser.`);
        updateBoardPicks();
      }
    });
  }
}
window.onhashchange = function () {
  location.reload();
};

