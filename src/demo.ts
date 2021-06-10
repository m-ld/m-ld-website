import { BoardView } from '../lib/client/BoardView';
import { MessageSubject } from '../lib/Message';
import { node } from '../lib/client/d3Util';
import { clone, MeldClone, shortId } from '@m-ld/m-ld';
import { AblyRemotes } from '@m-ld/m-ld/dist/ably';
import { WrtcPeering } from '@m-ld/m-ld/dist/wrtc';
import { configureLogging, Grecaptcha, modernizd } from '@m-ld/io-web-runtime/dist/client';
import * as d3 from 'd3';
import { BoardLocal } from '../lib/client/BoardLocal';
import {
  initPopupControls, loadingFinished, showAbout, showError, showNotModern
} from '../lib/client/PopupControls';
import { initBoardControls } from '../lib/client/BoardControls';
import { fetchConfig } from '../lib/client/Api';
import * as lifecycle from 'page-lifecycle';
import * as LOG from 'loglevel';
import { EMPTY, fromEvent, merge } from 'rxjs';
import { debounce, debounceTime, filter, last, startWith, takeUntil } from 'rxjs/operators';
import EventEmitter = require('events');

window.onload = async function () {
  await modernizd([]).catch(showNotModern);
  new Demo().initialise().catch(err =>
    showError(err, { href: '#new', text: 'create a new board' }));
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
    const requestedDomain = document.location.hash.slice(1) ?? '';
    showAbout(requestedDomain === '');
    let domain: string = this.local.targetDomain(requestedDomain);
    // Get the configuration for the domain
    await Grecaptcha.ready;
    const config = await fetchConfig(domain);
    configureLogging(config, LOG);
    domain = config['@domain'];

    history.replaceState(null, '', '#' + domain);

    // Initialise the m-ld clone with a local backend
    const backend = await this.local.load(domain);
    const backendEvents = new EventEmitter;
    const remotes = new AblyRemotes(config, { peering: new WrtcPeering(config) });
    const meld = await clone(backend, remotes, config, { backendEvents });
    window.addEventListener('unload', () => meld.close());

    // Set up auto-save.
    this.setupAutoSave(meld, backendEvents);

    // Wait for the latest state from the clone
    // (Remove this line to see rev-ups as they happen)
    await meld.status.becomes({ outdated: false });

    // When the clone goes offline, show a suitable warning
    meld.status.subscribe(status => this.local.online = status.online);

    // Unshow the loading progress
    loadingFinished();

    // The welcome message uses the id of the domain - it can't be deleted
    const welcomeId = shortId(domain);

    // Create the board UI View
    new BoardView('#board', meld, welcomeId);

    // Add the welcome message if not already there
    const isNew = (await meld.get(welcomeId)) == null;
    if (isNew) {
      await meld.write(MessageSubject.create({
        '@id': welcomeId,
        text: `Welcome to your message board, ${domain}!<br>
        For help using this app, click the (?) button on the left.`,
        x: 200, y: 100
      }));
    }
  }

  setupAutoSave(meld: MeldClone, backendEvents: EventEmitter) {
    // Safety net in case the user manages to unload in the dirty state
    this.local.on('dirty', dirty => lifecycle[dirty ?
      'addUnsavedChanges' : 'removeUnsavedChanges'](this));

    const autoSave = () => new Promise((resolve, reject) =>
      // We want to save from a consistent read state, but memdown iterates a
      // snapshot so we don't have to keep the state locked
      meld.read(() => this.local.save().then(resolve, reject)));

    // When commits are made in the backend, set the dirty status
    backendEvents.on('commit', () => { this.local.dirty = true; });

    merge(
      // Clicked save button
      fromEvent(node<HTMLButtonElement>(d3.select('#save-board')), 'click'),
      // Navigating away
      fromEvent(this.local, 'navigate'),
      // Debounced five seconds after update
      fromEvent(this.local, 'dirty').pipe(
        startWith(...this.local.dirty ? ['dirty'] : []),
        debounceTime(5000)),
      // Passivation of the page
      fromEvent(lifecycle, 'statechange').pipe(
        filter(event => event.newState === 'passive')),
      // Mouse leaves (e.g. to navigate)
      fromEvent(document.body, 'mouseleave'),
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