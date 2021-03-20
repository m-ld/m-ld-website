import { BoardView } from '../lib/client/BoardView';
import { Message } from '../lib/Message';
import { node } from '../lib/client/d3Util';
import { clone, MeldClone, shortId } from '@m-ld/m-ld';
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
import * as lifecycle from 'page-lifecycle';
import * as LOG from 'loglevel';
import { EMPTY, fromEvent, merge, Subscription } from 'rxjs';
import {
  debounce, debounceTime, distinctUntilChanged, filter, last, map, startWith, takeUntil
} from 'rxjs/operators';

window.onload = async function () {
  await modernizd(['indexeddb']).catch(showNotModern);
  new Demo().initialise().catch(showError);
}

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
    await Grecaptcha.ready;
    let domain: string = this.local.targetDomain(document.location.hash.slice(1) ?? '');
    // Get the configuration for the domain
    const config = await fetchConfig(domain, this.local.getBotName(domain));
    configureLogging(config, LOG);
    domain = config['@domain'];

    const botName = config.botName ?? false;
    this.local.setBotName(domain, botName);
    history.replaceState(null, '', '#' + domain);

    // Initialise the m-ld clone with a local backend
    const backend = await this.local.load(domain);
    const meld = await clone(backend, AblyRemotes, config);
    window.addEventListener('unload', () => meld.close());

    // Set up auto-save.
    this.setupAutoSave(meld);

    // Wait for the latest state from the clone
    // (Remove this line to see rev-ups as they happen)
    await meld.status.becomes({ outdated: false });

    // When the clone goes offline, show a suitable warning
    meld.status.subscribe(status => this.local.online = status.online);

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
  }

  setupAutoSave(meld: MeldClone) {
    // Safety net in case the user manages to unload in the dirty state
    this.local.on('dirty', dirty => lifecycle[dirty ?
      'addUnsavedChanges' : 'removeUnsavedChanges'](this));

    const autoSave = () => new Promise((resolve, reject) =>
      // We want to save from a consistent read state, but memdown iterates a
      // snapshot so we don't have to keep the state locked
      meld.read(() => this.local.save().then(resolve, reject)));

    // When the document updates, set the dirty status
    meld.follow(() => { this.local.dirty = true; });

    merge(
      // Clicked save button
      fromEvent(node<HTMLButtonElement>(d3.select('#save')), 'click'),
      // Navigating away
      fromEvent(this.local, 'navigate'),
      // Debounced five seconds after update
      fromEvent(this.local, 'dirty').pipe(debounceTime(5000)),
      // Passivation of the page
      fromEvent(lifecycle, 'statechange').pipe(filter(event => event.newState === 'passive')),
      // Mouse leaves (e.g. to navigate)
      fromEvent(document, 'mouseleave'),
      // Trying to unload
      fromEvent(window, 'beforeunload')
    ).pipe(
      // Stop when meld is closed
      takeUntil(meld.status.pipe(last())),
      // Save and do not overlap saves
      debounce(() => this.local.dirty ? autoSave() : EMPTY)
    ).subscribe(() =>
      // Only allow navigation when saved
      this.navigateIfPending());
  }

  private navigateIfPending() {
    if (this.local.destination === 'new')
      location.hash = 'new';
    else if (this.local.destination === 'home')
      location.href = '/';
    else if (this.local.destination != null)
      location.hash = this.local.destination;
  }
}