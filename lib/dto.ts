import { MeldAblyConfig } from '@m-ld/m-ld/ext/ably';
import { Answer } from './BotBrain';
import { AuthorisedRequest, Session } from '@m-ld/io-web-runtime/dist/dto';
import { MeldWrtcConfig } from '@m-ld/m-ld/ext/wrtc';

export namespace Config {
  export interface Request
    extends AuthorisedRequest {
    /**
     * Blank domain asks the config service for a new domain
     */
    '@domain': string | '';
    /**
     * Domain active bot name, or false if none yet exists
     */
    botName?: string | false;
    /**
     * Google reCAPTCHA token
     */
    token: string;
  }

  export type Response = MeldAblyConfig & MeldWrtcConfig & AblyTokenSession;
}

export namespace Renew {
  export type Request = AuthorisedRequest & AblyTokenSession;
  export type Response = AblyTokenSession;
}

export namespace Chat {
  export interface Request
    extends AuthorisedRequest {
    botName: string;
    message: string;
    topMessages: string[];
    /**
     * JWT token returned from Config request
     */
    token: string;
  }

  export type Response = Answer;
}

export interface TopicIndexEntry {
  title: string;
  patterns: string[];
  summary: string;
  id: string;
}

export interface AblyTokenSession extends Session {
  /**
   * JWT token, must be Ably-compatible
   * @see https://www.ably.io/documentation/core-features/authentication#ably-jwt
   */
  token: string;
}