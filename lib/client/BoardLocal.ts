import { EventEmitter } from 'events';
import * as local from 'local-storage';
import { MeldMemDown } from '@m-ld/m-ld/ext/memdown';
import { LevelDownResponse } from './LevelDownResponse';
import type { LockManager } from 'navigator.locks';
import { clone, MeldClone, MeldConfig } from '@m-ld/m-ld';
import { AblyWrtcRemotes } from '@m-ld/m-ld/ext/ably/index';
import * as lifecycle from 'page-lifecycle';
import { fromEvent, merge, of } from 'rxjs';
import { node } from './d3Util';
import * as d3 from 'd3';
import { debounce, debounceTime, filter, last, startWith, takeUntil } from 'rxjs/operators';
import { saveAs } from 'file-saver';

require('navigator.locks'); // Polyfill
declare global {
  // noinspection JSUnusedGlobalSymbols
  interface Navigator {
    locks: LockManager;
  }
}

export type Domain = string; // An internet-style m-ld domain name
export type Version = 'v0' | 'v1' | 'v2'
  | 'v3' // Moved to Cache API
  | 'v4' // Journal and encoding changes for fusions
  | 'v5' // TIDs in key-values
  | 'v6'; // Principal and agreement in operations
export const CURRENT_VERSION: Version = 'v6';
export const INDEXED_DB_VERSIONS: Version[] = ['v0', 'v1', 'v2'];

const CACHE_KEY = 'board-data';

export class BoardLocal extends EventEmitter {
  private meld?: { domain: string, clone: MeldClone, backend: MeldMemDown };
  private backendEvents = new EventEmitter;
  private cache: Promise<Cache>;
  private _destination: Domain | 'home' | 'new' | undefined;
  private _dirty?: boolean;
  private _online?: boolean;

  constructor() {
    super();
    this.cache = caches.open(CACHE_KEY);
  }

  /** Return of '' means create a new domain */
  targetDomain(domain: Domain | 'new'): Domain | '' {
    const first = this.domains.find(v => v[0] === CURRENT_VERSION)?.[1];
    const invalid = (domain: Domain) => this.domains.some(
      v => v[0] !== CURRENT_VERSION && v[1] === domain);
    if (domain === 'new' || invalid(domain) || (!domain && !first)) {
      // Create a new domain
      return '';
    } else if (!domain && first) {
      // Return to the last domain visited
      return first;
    }
    return domain;
  }

  get domains(): [Version, Domain][] {
    return (local.get<Domain[]>('m-ld.domains') ?? []).map(toVersioned);
  }

  private static setDomains(domains: [Version, Domain][]) {
    local.set<Domain[]>('m-ld.domains', domains.map(fromVersioned));
  }

  async removeDomain([version, name]: [Version, Domain]) {
    BoardLocal.setDomains(this.domains.filter(v => v[1] !== name));
    if (INDEXED_DB_VERSIONS.includes(version)) {
      return new Promise((resolve, reject) => {
        const req = indexedDB.deleteDatabase(`level-js-${name}`);
        req.onsuccess = resolve;
        req.onerror = reject;
      });
    } else {
      return (await this.cache).delete(name);
    }
  }

  set online(online: boolean) {
    if (this._online !== online)
      this.emit('online', this._online = online);
  }

  get online() {
    return this._online ?? false;
  }

  navigate(destination: Domain | 'home' | 'new') {
    this.emit('navigate', this._destination = destination);
  }

  get destination() {
    return this._destination;
  }

  set dirty(dirty: boolean) {
    if (this._dirty !== dirty)
      this.emit('dirty', this._dirty = dirty);
  }

  get dirty() {
    return this._dirty ?? false;
  }

  async load(config: MeldConfig) {
    // Push the domain to the top of the list
    let localDomains = this.domains;
    localDomains = localDomains.filter(v => v[1] !== config['@domain']);
    localDomains.unshift([CURRENT_VERSION, config['@domain']]);
    BoardLocal.setDomains(localDomains);
    // Do we have a cache for this backend?
    const data = await (await this.cache).match(config['@domain']);
    const backend = new MeldMemDown;
    if (data != null) {
      await LevelDownResponse.readInto(backend, data);
      this.dirty = false;
    } else {
      this.dirty = true; // New domain starts dirty
    }
    this.meld = {
      domain: config['@domain'],
      clone: await clone(backend, AblyWrtcRemotes,
        config, { backendEvents: this.backendEvents }),
      backend
    };
    window.addEventListener('unload', () => this.meld?.clone.close());
    // Set up auto-save.
    this.setupAutoSave(this.meld.clone);
    return this.meld.clone;
  }

  download() {
    if (this.meld != null) {
      this.meld.clone.read(async () => {
        const blob = await LevelDownResponse.readFrom(
          this.meld!.backend, 'application/json').blob();
        saveAs(blob, `${this.meld!.domain}.json`);
      });
    }
  }

  private setupAutoSave(meld: MeldClone) {
    // Safety net in case the user manages to unload in the dirty state
    this.on('dirty', dirty => lifecycle[dirty ?
      'addUnsavedChanges' : 'removeUnsavedChanges'](this));

    const autoSave = () => new Promise((resolve, reject) =>
      // We want to save from a consistent read state, but memdown iterates a
      // snapshot so we don't have to keep the state locked
      meld.read(() => this.save().then(resolve, reject)));

    // When commits are made in the backend, set the dirty status
    this.backendEvents.on('commit', () => { this.dirty = true; });

    merge(
      // Clicked save button
      fromEvent(node<HTMLButtonElement>(d3.select('#save-board')), 'click'),
      // Navigating away
      fromEvent(this, 'navigate'),
      // Debounced five seconds after update
      fromEvent(this, 'dirty').pipe(
        startWith(...this.dirty ? ['dirty'] : []),
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
      debounce(() => this.dirty ? autoSave() : of(0))
    ).subscribe(() =>
      // Only allow navigation when saved
      this.navigateIfPending());
  }

  private async save() {
    this.emit('saving', true);
    try {
      if (this.meld == null)
        throw new Error('No active domain!');
      // Save the data
      const response = LevelDownResponse.readFrom(this.meld.backend);
      await (await this.cache).put(this.meld.domain, response);
      this.dirty = false;
      return this.meld.domain;
    } finally {
      this.emit('saving', false);
    }
  }

  private navigateIfPending() {
    if (this.destination === 'new')
      location.hash = 'new';
    else if (this.destination === 'home')
      location.href = '/';
    else if (this.destination != null)
      location.hash = this.destination;
  }
}

function toVersioned(value: string): [Version, Domain] {
  const match = value.match(/(v\d+)\.(.+)/);
  return match == null ? ['v0', value] : [<Version>match[1], match[2]];
}

function fromVersioned(versioned: [Version, Domain]): string {
  return versioned.join('.');
}


