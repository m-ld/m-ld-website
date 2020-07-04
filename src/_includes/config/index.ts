import { MeldAblyConfig } from '@m-ld/m-ld/dist/ably';

export namespace Config {
  export interface Client {
    recaptcha: { site: string };
  }

  export interface Request {
    '@id': string;
    '@domain'?: string;
    token: string;
  }

  export type Response = MeldAblyConfig & { ably: MeldAblyConfig['ably'] & { token: string } };
}