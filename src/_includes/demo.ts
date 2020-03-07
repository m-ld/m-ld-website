import { BoardView } from './lib/BoardView';
import { shortId } from 'm-ld/dist/util';
import { Message } from './lib/Message';
import { clone } from 'm-ld';
import * as Level from 'level-js';
import { Update } from 'm-ld/dist/m-ld/jsonrql';

window.onload = function () {
  const domain = document.location.hash.slice(1);
  if (!domain)
    throw new Error('No domain specified');

  clone(Level(domain), {
    domain, genesis: true, mqttOpts: { host: 'localhost', port: 8888, protocol: 'ws' }
  }).then(meld => {
    new BoardView('#board', meld);

    const ids = [shortId(), shortId(), shortId()];

    meld.transact({
      '@id': ids[0],
      '@type': 'Message',
      text: 'Hello!',
      x: 200, y: 100,
      linkTo: []
    } as Message);
    setTimeout(() => {
      meld.transact({
        '@insert': [
          {
            '@id': ids[1],
            '@type': 'Message',
            text: 'This is your new collaborative message board.',
            x: 250, y: 200,
            linkTo: []
          } as Message,
          {
            '@id': ids[0], linkTo: [{ '@id': ids[1] }]
          } as Partial<Message>
        ]
      } as Update);
      setTimeout(() => {
        meld.transact({
          '@insert': [
            {
              '@id': ids[2],
              '@type': 'Message',
              text: "We'll use it to demonstrate how m-ld works.",
              x: 300, y: 300,
              linkTo: []
            } as Message,
            {
              '@id': ids[1], linkTo: [{ '@id': ids[2] }]
            } as Partial<Message>
          ]
        } as Update);
      }, 2000);
    }, 2000);
  });
}