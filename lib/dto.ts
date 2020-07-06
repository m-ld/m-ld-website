import { MeldAblyConfig } from '@m-ld/m-ld/dist/ably';

export interface AuthorisedRequest {
  origin: string;
  token: string;
}

export namespace Config {
  export interface Request extends AuthorisedRequest {
    '@id': string;
    '@domain': string | null;
    botName: string | null;
  }

  export type Response = MeldAblyConfig & {
    botName: string;
    ably: MeldAblyConfig['ably'] & { token: string };
  };
}

export namespace Chat {
  export interface Request extends AuthorisedRequest {
    botName: string;
    message: string;
    topMessages: string[];
  }

  export interface Response {
    message: string | null;
  }
}