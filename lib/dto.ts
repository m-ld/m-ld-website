import { MeldAblyConfig } from '@m-ld/m-ld/dist/ably';
import { Answer } from './BotBrain';
import { JsonLog } from 'loglevel-plugin-remote';
import { MeldConfig } from '@m-ld/m-ld';

export type AuthType = 'recaptcha' | 'jwt';

export const ID_HEADER = 'm-ld-id';
export const DOMAIN_HEADER = 'm-ld-domain';

export interface AuthorisedRequest extends Pick<MeldConfig, '@domain' | '@id'> {
  /**
   * window.location.origin
   */
  origin: string;
  /**
   * Token content varies depending on the end-point, see below.
   */
  token: string;
}

type JwtToken = string;
type RecaptchaToken = string;

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
    botName: string | false;
    /**
     * Google reCAPTCHA token
     */
    token: RecaptchaToken;
  }

  export type Response = MeldAblyConfig & {
    /**
     * Domain active bot, or `false` to disable the bot
     */
    botName: string | false;
    /**
     * JWT token, must be Ably-compatible
     * @see https://www.ably.io/documentation/core-features/authentication#ably-jwt
     */
    token: JwtToken;
  };
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
    token: JwtToken;
  }

  export type Response = Answer;
}

export interface FaqIndexEntry {
  question: string;
  patterns: string[];
  summary: string;
  id: string;
}

export namespace Log {
  export interface Request
    extends AuthorisedRequest {
    logs: JsonLog[];
  }

  export type Response = void;
}