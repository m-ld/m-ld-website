import { BoardView } from './lib/BoardView';
import { Message } from './lib/Message';
import { clone } from '@gsvarovsky/m-ld';
import * as Level from 'level-js';
import { Update } from '@gsvarovsky/m-ld/dist/m-ld/jsonrql';
import config from './config';

window.onload = function () {
  const domain = document.location.hash.slice(1);
  if (!domain)
    throw new Error('No domain specified');

  clone(Level(domain), { '@domain': domain, mqttOpts: config.mqtt }).then(async meld => {
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

      setTimeout(() => {
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

        setTimeout(() => {
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
        }, 2000);
      }, 2000);
    }

    window.addEventListener('unload', () => meld.close());
  });
}