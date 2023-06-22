import { BoardView } from '../lib/client/BoardView';
import { MessageSubject } from '../lib/Message';
import { MeldConfig, shortId } from '@m-ld/m-ld';
import { configureLogging, Grecaptcha, modernizd } from '@m-ld/io-web-runtime/dist/client';
import { BoardLocal } from '../lib/client/BoardLocal';
import {
  initPopupControls,
  loadingFinished,
  showAbout,
  showError,
  showNotModern
} from '../lib/client/PopupControls';
import { initBoardControls } from '../lib/client/BoardControls';
import { fetchConfig } from '../lib/client/Api';
import * as LOG from 'loglevel';

window.onload = async function () {
  await modernizd([]).catch(showNotModern);
  new Demo().initialise().catch(err =>
    showError(err, { href: '#new', text: 'create a new board' }));
};

window.onhashchange = function () {
  location.reload();
};

class Demo {
  local = new BoardLocal();

  constructor() {
    initPopupControls();
    initBoardControls(this.local);
  }

  async initialise() {
    const requestedDomain = document.location.hash.slice(1) ?? '';
    showAbout(requestedDomain === '');
    let domain: string = this.local.targetDomain(requestedDomain);
    // Get the configuration for the domain
    await Grecaptcha.ready;
    const config = await fetchConfig(domain);
    configureLogging(config, LOG);
    domain = config['@domain'];

    await navigator.locks.request(domain, { ifAvailable: true },
      lock => new Promise(async (resolve, reject) => {
        if (lock == null) {
          reject(`${domain} is open on another tab`);
        } else {
          window.addEventListener('unload', resolve);
          this.loadDomain(config).catch(reject);
        }
      }));
  }

  async loadDomain(config: MeldConfig) {
    history.replaceState(null, '', '#' + config['@domain']);

    // Initialise the m-ld clone with a local backend
    const meld = await this.local.load(config);

    // Wait for the latest state from the clone
    // (Remove this line to see rev-ups as they happen)
    await meld.status.becomes({ outdated: false });

    // When the clone goes offline, show a suitable warning
    meld.status.subscribe(status => this.local.online = status.online);

    // Unshow the loading progress
    loadingFinished();

    // The welcome message uses the id of the domain - it can't be deleted
    const welcomeId = shortId(config['@domain']);

    // Create the board UI View
    new BoardView('#board', meld, welcomeId);

    // Add the welcome message if not already there
    const isNew = (await meld.get(welcomeId)) == null;
    if (isNew) {
      await meld.write(MessageSubject.create({
        '@id': welcomeId,
        text: `'Welcome to your message board, ${config['@domain']}!\n` +
        'For help using this app, click the (?) button on the left.',
        x: 200, y: 100
      }));
    }
  }
}