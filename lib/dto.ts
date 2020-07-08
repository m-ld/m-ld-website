import { MeldAblyConfig } from '@m-ld/m-ld/dist/ably';
import { BotBrain, Answer } from './BotBrain';

export interface AuthorisedRequest {
  origin: string;
  token: string;
}

export namespace Config {
  export interface Request
    extends AuthorisedRequest {
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
  export interface Request
    extends AuthorisedRequest {
    botName: string;
    message: string;
    topMessages: string[];
  }

  export type Response = Answer;
}

export interface FaqIndexEntry {
  question: string;
  patterns: string[];
  summary: string;
  id: string;
}