import * as local from 'local-storage';
import MemDown from 'memdown';

export type Version = 'v0' | 'v1' | 'v2' | 'v3';
export const CURRENT_VERSION: Version = 'v3';
export const INDEXED_DB_VERSIONS: Version[] = ['v0', 'v1', 'v2'];

const CACHE_KEY = 'board-data';

export class BoardLocal {
  private backend: MemDown<Uint8Array, Uint8Array> | undefined;
  private domain: string | undefined;

  /** Return of '' means create a new domain */
  targetDomain(domain: string): string | '' {
    const first = this.domains.find(v => v[0] === CURRENT_VERSION)?.[1];
    const invalid = (domain: string) => this.domains.some(v => v[0] !== CURRENT_VERSION && v[1] === domain);
    if (domain === 'new' || invalid(domain) || (!domain && !first)) {
      // Create a new domain
      return '';
    } else if (!domain && first) {
      // Return to the last domain visited
      return first;
    }
    return domain;
  }

  get domains(): [Version, string][] {
    return (local.get<string[]>('m-ld.domains') ?? []).map(toVersioned);
  }

  private setDomains(domains: [Version, string][]) {
    local.set<string[]>('m-ld.domains', domains.map(fromVersioned));
  }

  async load(domain: string) {
    // Push the domain to the top of the list
    let localDomains = this.domains;
    localDomains = localDomains.filter(v => v[1] !== domain);
    localDomains.unshift([CURRENT_VERSION, domain]);
    this.setDomains(localDomains);
    // Do we have a cache for this backend?
    const cache = await this.cache;
    const data = await cache.match(domain);
    const backend = this.backend = new MemDown;
    this.domain = domain;
    if (data != null && data.body != null) {
      const reader = new KeyValueReader(data.body.getReader());
      while (true) {
        const [key, value] = await reader.read();
        if (key != null && value != null)
          await new Promise((resolve, reject) => backend.put(
            // Must convert to Buffer because memdown detects Buffer._isBuffer
            Buffer.from(key), Buffer.from(value),
            err => err ? reject(err) : resolve(null)));
        else
          break;
      }
    }
    return this.backend;
  }

  async save() {
    const cache = await this.cache;
    if (this.backend == null || this.domain == null)
      throw new Error('No active domain!');
    const iterator = this.backend.iterator();
    const stream = new ReadableStream({
      async pull(controller) {
        iterator.next((err, key, value) => {
          if (err) {
            controller.error(err);
          } else if (key == null || value == null) {
            controller.close();
          } else {
            controller.enqueue(new Uint8Array([
              ...int32Buf(key.length), ...key,
              ...int32Buf(value.length), ...value
            ]));
          }
        });
      }
    });
    const headers = new Headers({ 'Content-Type': 'application/octet-stream' });
    await cache.put(this.domain, new Response(stream, { headers }));
    return this.domain;
  }

  private get cache() {
    return caches.open(CACHE_KEY);
  }

  async removeDomain([version, name]: [Version, string]) {
    this.setDomains(this.domains.filter(v => v[1] !== name));
    if (INDEXED_DB_VERSIONS.includes(version)) {
      return new Promise((resolve, reject) => {
        const req = indexedDB.deleteDatabase(`level-js-${name}`);
        req.onsuccess = resolve;
        req.onerror = reject;
      });
    } else {
      const cache = await this.cache;
      return cache.delete(name);
    }
  }

  getBotName(domain: string | ''): string | false {
    return domain ? local.get<string>(`${domain}.bot`) ?? false : false;
  }

  setBotName(domain: string, name: string | false) {
    if (domain && name)
      local.set<string>(`${domain}.bot`, name);
    else
      local.remove(`${domain}.bot`);
  }
}

function int32Buf(int: number) {
  return new Uint8Array(new Uint32Array([int]).buffer);
}

function buf32Int(buf: Uint8Array) {
  return new Uint32Array(buf.slice(0, Uint32Array.BYTES_PER_ELEMENT).buffer)[0];
}

function toVersioned(value: string): [Version, string] {
  const match = value.match(/(v\d+)\.(.+)/);
  return match == null ? ['v0', value] : [<Version>match[1], match[2]];
}

function fromVersioned(versioned: [Version, string]): string {
  return versioned.join('.');
}

class KeyValueReader {
  buffer = new Uint8Array(0);
  pos = 0;

  constructor(
    readonly reader: ReadableStreamDefaultReader<Uint8Array>) {
  }

  async read(): Promise<[Uint8Array, Uint8Array] | []> {
    const key = await this.readNext();
    if (key != null) {
      const value = await this.readNext();
      if (value == null)
        throw new Error('Unexpected EOF');
      return [key, value];
    }
    return [];
  }

  async readNext(): Promise<Uint8Array | null> {
    const lenBuf8 = await this.readUint8s(Uint32Array.BYTES_PER_ELEMENT);
    return lenBuf8 != null ? await this.readUint8s(buf32Int(lenBuf8)) : null;
  }

  private async readUint8s(length: number): Promise<Uint8Array | null> {
    if (this.pos + length <= this.buffer.length) {
      return this.buffer.subarray(this.pos, this.pos += length);
    } else {
      const buffer = new Uint8Array(length);
      for (let i = 0; i < length; i++) {
        if (this.pos >= this.buffer.length) {
          const { value } = await this.reader.read();
          if (value == null)
            return null;
          this.buffer = value;
        }
        buffer[i] = this.buffer[this.pos++];
      }
      return buffer;
    }
  }
}
