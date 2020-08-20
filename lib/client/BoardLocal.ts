import * as local from 'local-storage';

export class BoardLocal {
  get domains(): string[] {
    return local.get<string[]>('m-ld.domains') ?? [];
  }

  private setDomains(domains: string[]) {
    local.set<string[]>('m-ld.domains', domains);
  }

  addDomain(domain: string) {
    let localDomains = this.domains;
    localDomains = localDomains.filter(d => d !== domain);
    localDomains.unshift(domain);
    this.setDomains(localDomains);
  }

  removeDomain(domain: string) {
    this.setDomains(this.domains.filter(d => d !== domain));
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
