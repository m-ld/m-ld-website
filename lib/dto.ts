import { MeldAblyConfig } from '@m-ld/m-ld/ext/ably';
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