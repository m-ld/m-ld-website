import type { MeldAblyConfig } from '@m-ld/m-ld/ext/ably';
import type { MeldIoConfig } from '@m-ld/m-ld/ext/socket.io';
import type { AuthorisedRequest, Session } from '@m-ld/io-web-runtime/dist/dto';

export namespace Config {
  export type GatewayOptions = {
    use: boolean,
    origin: string,
    user: string,
    key: string
  };

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
    /**
     * Gateway details, if available
     */
    gateway?: GatewayOptions;
  }

  export type Response = (MeldAblyConfig | MeldIoConfig) & AblyTokenSession;
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