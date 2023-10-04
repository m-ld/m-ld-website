/**
 * 'Template' that runs browserify to generate playground/playground.js
 */
const { join } = require('path');
const { renderTs } = require('@m-ld/io-web-build');

module.exports = class {
  data() {
    return { permalink: 'playground/playground.js' };
  }
  render() {
    return renderTs({
      tsPath: join(__dirname, 'playground.ts'),
      shims: ['events', 'buffer', 'querystring'],
      envVars: ['RECAPTCHA_SITE', 'RECAPTCHA_V2_SITE', 'GTAG_ID']
    });
  }
}