/**
 * @see https://github.com/kutuluk/loglevel-plugin-remote#api
 */
declare module 'loglevel-plugin-remote' {
  import { RootLogger, LogLevelDesc, LogLevelNumbers } from 'loglevel';

  /**
   * @see https://github.com/kutuluk/loglevel-plugin-remote#applyloglevel-options
   */
  interface RemoteOptions {
    url: string;
    method?: string;
    headers?: { [header: string]: string };
    token?: string;
    onUnauthorized?: (failedToken: string) => void;
    timeout?: number;
    interval?: number;
    level?: LogLevelDesc;
    backoff?: {
      multiplier: number;
      jitter: number;
      limit: number;
    };
    capacity?: number;
    stacktrace?: {
      levels: LogLevelDesc[];
      depth: number;
      excess: 0;
    };
    timestamp?: () => string;
    format?: (log: Log) => string | object;
  }

  interface Log {
    message: string;
    level: {
      label: LogLevelDesc & string,
      value: LogLevelNumbers,
    };
    logger: string;
    timestamp: string;
    stacktrace: string;
  }

  interface JsonLog {
    message: string;
    level: LogLevelDesc & string,
    logger: string;
    timestamp: string;
    stacktrace: string;
  }

  /**
   * @see https://github.com/kutuluk/loglevel-plugin-remote#applyloglevel-options
   */
  export function apply(log: RootLogger, options?: RemoteOptions): void;

  /**
   * @see https://github.com/kutuluk/loglevel-plugin-remote#settokentoken
   */
  export function setToken(token: string): void;
  
  export function plain(log: Log): string;
  export function json(log: Log): JsonLog;

  export function disable(): void;
}