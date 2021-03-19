import { BoardView } from '../lib/client/BoardView';
import { Message } from '../lib/Message';
import { clone, shortId } from '@m-ld/m-ld';
import { AblyRemotes } from '@m-ld/m-ld/dist/ably';
import { modernizd, Grecaptcha, configureLogging } from '@m-ld/io-web-runtime/dist/client';
import * as d3 from 'd3';
import { BoardLocal } from '../lib/client/BoardLocal'
import {
  initPopupControls, showError, showInfo, showNotModern, showWarning
} from '../lib/client/PopupControls';
import { initBoardControls } from '../lib/client/BoardControls';
import { BoardBot } from '../lib/BoardBot';
import { fetchAnswer, fetchConfig } from '../lib/client/Api';
import * as LOG from 'loglevel';

window.onload = async function () {
  try {
    await modernizd(['indexeddb']);
  } catch (err) {
    return showNotModern(err);
  }
  initPopupControls();
  const local = new BoardLocal();
  initBoardControls(local);

  await Grecaptcha.ready;

  try {
    let domain: string = local.targetDomain(document.location.hash.slice(1) ?? '');
    // Get the configuration for the domain
    const config = await fetchConfig(domain, local.getBotName(domain));
    configureLogging(config, LOG);
    domain = config['@domain'];

    const botName = config.botName ?? false;
    local.setBotName(domain, botName);
    history.replaceState(null, '', '#' + domain);

    // Initialise the m-ld clone with a local backend
    const backend = await local.load(domain);
    const meld = await clone(backend, AblyRemotes, config);
    // Save the board as soon as it has initialised and periodically after
    // update
    let saveQueued = false;
    function queueSave() {
      if (!saveQueued) {
        saveQueued = true;
        setTimeout(() => meld.read(async () => {
          await local.save();
          saveQueued = false;
        }), 2000);
      }
    }
    meld.read(queueSave, queueSave);
    window.addEventListener('unload', async () => {
      await meld.close();
      await local.save(); // Saves final state
    });

    // Wait for the latest state from the clone
    // (Remove this line to see rev-ups as they happen)
    await meld.status.becomes({ outdated: false });

    // When the clone goes offline, show a suitable warning
    let online = meld.status.value.online;
    const statusSub = meld.status.subscribe(status => {
      if (status.online !== online && !status.online) {
        showWarning('It looks like this browser is offline. ' +
          'You can keep working, but don\'t refresh the page.');
        meld.status.becomes({ online: true })
          .then(() => showInfo('Back online!'));
      }
      online = status.online;
    }, showError);
    window.addEventListener('beforeunload', () => statusSub.unsubscribe());

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
      await meld.write<Message>({
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
        respond: (message: string, topMessages: string[]) =>
          fetchAnswer(config, message, topMessages)
      }).start(isNew);
  } catch (err) {
    showError(err);
  }
}
window.onhashchange = function () {
  location.reload();
};

