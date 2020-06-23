import { MeldMqttConfig } from '@m-ld/m-ld/dist/mqtt';

export namespace Config {
  export interface Client {
    recaptcha: { site: string };
  }

  export interface Request {
    '@id': string;
    '@domain'?: string;
    token: string;
  }

  export type Response = MeldMqttConfig;
}