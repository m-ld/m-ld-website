import { Renew } from '../lib/dto';
import { responder } from '@m-ld/io-web-runtime/dist/lambda';
import { ablyJwtAuth, ablyToken, PrefixAuth, recaptchaV2Auth } from '../lib/api/authorisations';

// Authorisation for token renewal can be a previous token or a reCAPTCHA
export default responder<Renew.Request, Renew.Response>(new PrefixAuth({
  jwt: ablyJwtAuth, recaptcha: recaptchaV2Auth
}), async renew => {
  return {
    '@id': renew['@id'], '@domain': renew['@domain'], logLevel: renew.logLevel,
    token: await ablyToken(renew['@domain'], renew['@id'])
  };
});
