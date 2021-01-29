import * as local from 'local-storage';

export type Version = 'v0' | 'v1' | 'v2';
export const CURRENT_VERSION: Version = 'v2';

export class BoardLocal {
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

  addDomain(domain: string) {
    let localDomains = this.domains;
    localDomains = localDomains.filter(v => v[1] !== domain);
    localDomains.unshift([CURRENT_VERSION, domain]);
    this.setDomains(localDomains);
  }

  removeDomain(domain: string) {
    this.setDomains(this.domains.filter(v => v[1] !== domain));
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

function toVersioned(value: string): [Version, string] {
  const match = value.match(/(v\d+)\.(.+)/);
  return match == null ? ['v0', value] : [<Version>match[1], match[2]];
}

function fromVersioned(versioned: [Version, string]): string {
  return versioned.join('.');
}
