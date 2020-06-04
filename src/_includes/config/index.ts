import { MeldConfig } from '@m-ld/m-ld';

export namespace Config {
  export interface Client {
    recaptcha: { site: string };
  }

  export interface Request {
    '@domain'?: string;
    token: string;
  }

  export type Response = MeldConfig;
}