import { EventEmitter } from 'events';
import * as local from 'local-storage';
import { MeldMemDown } from '@m-ld/m-ld/dist/memdown';
import { LevelDownResponse } from './LevelDownResponse';

export type Domain = string; // An internet-style m-ld domain name
export type Version = 'v0' | 'v1' | 'v2'
  | 'v3' // Moved to Cache API
  | 'v4'; // Journal and encoding changes for fusions
export const CURRENT_VERSION: Version = 'v4';
export const INDEXED_DB_VERSIONS: Version[] = ['v0', 'v1', 'v2'];

const CACHE_KEY = 'board-data';

export class BoardLocal extends EventEmitter {
  private backend: MeldMemDown | undefined;
  private domain: Domain | undefined;
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

  async load(domain: Domain) {
    // Push the domain to the top of the list
    let localDomains = this.domains;
    localDomains = localDomains.filter(v => v[1] !== domain);
    localDomains.unshift([CURRENT_VERSION, domain]);
    BoardLocal.setDomains(localDomains);
    // Do we have a cache for this backend?
    const data = await (await this.cache).match(domain);
    // FIXME: location hack prevents multiple tabs on same domain
    const backend = this.backend = Object.assign(new MeldMemDown, { location: domain });
    this.domain = domain;
    if (data != null) {
      await LevelDownResponse.readInto(backend, data);
      this.dirty = false;
    } else {
      this.dirty = true; // New domain starts dirty
    }
    return this.backend;
  }

  async save() {
    this.emit('saving', true);
    try {
      if (this.backend == null || this.domain == null)
        throw new Error('No active domain!');
      // Save the data
      const response = LevelDownResponse.readFrom(this.backend);
      await (await this.cache).put(this.domain, response);
      this.dirty = false;
      return this.domain;
    } finally {
      this.emit('saving', false);
    }
  }
}

function toVersioned(value: string): [Version, Domain] {
  const match = value.match(/(v\d+)\.(.+)/);
  return match == null ? ['v0', value] : [<Version>match[1], match[2]];
}

function fromVersioned(versioned: [Version, Domain]): string {
  return versioned.join('.');
}


