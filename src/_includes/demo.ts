import { BoardView } from './lib/BoardView';
import { Message } from './lib/Message';
import { clone } from '@gsvarovsky/m-ld';
import * as Level from 'level-js';
import { Update } from '@gsvarovsky/m-ld/dist/m-ld/jsonrql';
import { Config } from './config';
import * as d3 from 'd3';

window.onload = function () {
  grecaptcha.ready(async () => {
    try {
      const token = await grecaptcha.execute(process.env.RECAPTCHA_SITE, { action: 'config' });

      // Get the configuration for this domain
      const meldConfig = await d3.json('/api/config', {
        method: 'post',
        headers: { 'Content-type': 'application/json; charset=UTF-8' },
        body: JSON.stringify({
          '@domain': document.location.hash.slice(1), token
        } as Config.Request)
      }) as Config.Response;
      history.replaceState(null, null, '#' + meldConfig['@domain']);

      // Initialise the m-ld clone
      const meld = await clone(Level(meldConfig['@domain']), meldConfig);
      window.addEventListener('unload', () => meld.close());

      // Wait for the latest state from the clone
      // (Remove this line to see rev-ups as they happen)
      await meld.latest();

      // Unshow the loading progress
      d3.select('#loading').classed('is-active', false);

      // Create the board UI View
      new BoardView('#board', meld);

      // Check if we've already said hello
      const hello = await meld.get('hello').toPromise();
      if (!hello) {
        meld.transact({
          '@id': 'hello',
          '@type': 'Message',
          text: 'Hello!',
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
            '@id': 'hello', linkTo: [{ '@id': 'thisIs' }]
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
      d3.select('#error')
        .classed('is-active', true)
        .select('.error-text').text(`${err}`);
    }
  });
  // Set up the warning notification delete button
  d3.select('#warning .delete').on('click', function (this: Element) {
    d3.select('#warning').classed('is-hidden', true);
  });
}