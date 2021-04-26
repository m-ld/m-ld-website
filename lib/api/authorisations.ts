import {
  Auth, JwtAuth, RecaptchaV2Auth, RecaptchaV3Auth, signJwt
} from '@m-ld/io-web-runtime/dist/lambda';

const [ABLY_KEY_NAME, ABLY_SECRET] = process.env.ABLY_KEY?.split(':') ?? [];

/**
 * Get an Ably token for the client
 */
export async function ablyToken(domain: string, clientId: string): Promise<string> {
  if (ABLY_KEY_NAME == null)
    throw 'Bad lambda configuration';
  return signJwt({
    'x-ably-capability': JSON.stringify({ [`${domain}:*`]: ['subscribe', 'publish', 'presence'] }),
    'x-ably-clientId': clientId
  }, ABLY_SECRET, {
    keyid: ABLY_KEY_NAME,
    expiresIn: '10m'
  });
}

export const ablyJwtAuth = new JwtAuth(ABLY_SECRET);
export const recaptchaV2Auth = new RecaptchaV2Auth(process.env.RECAPTCHA_V2_SECRET);
export const recaptchaV3Auth = new RecaptchaV3Auth(process.env.RECAPTCHA_SECRET);

export class PrefixAuth implements Auth {
  constructor(
    private readonly auths: { [prefix: string]: Auth }) {
  }

  authorise(token: string) {
    const prefix = token.split(':', 1)[0];
    token = token.slice(prefix.length + 1);
    if (prefix in this.auths)
      return this.auths[prefix].authorise(token);
    else
      throw `Invalid prefix ${prefix}`;
  }
}
