import { Renew } from '../lib/dto';
import { PrefixAuth, responder } from '@m-ld/io-web-runtime/dist/lambda';
import { recaptchaV2Auth } from '@m-ld/io-web-runtime/dist/server/recaptcha';
import { ablyJwtAuth, ablyToken } from '@m-ld/io-web-runtime/dist/server/ably';

// Authorisation for token renewal can be a previous token or a reCAPTCHA
export default responder<Renew.Request, Renew.Response>(new PrefixAuth({
  jwt: ablyJwtAuth, recaptcha: recaptchaV2Auth
}), async renew => {
  return {
    '@id': renew['@id'], '@domain': renew['@domain'], logLevel: renew.logLevel,
    token: await ablyToken(renew['@domain'], renew['@id'])
  };
});
