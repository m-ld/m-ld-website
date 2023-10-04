/**
 * 'Template' that runs browserify to generate demo/demo.js
 */
const { join } = require('path');
const { renderTs } = require('@m-ld/io-web-build');

module.exports = class {
  data() {
    return { permalink: 'demo/demo.js' };
  }
  render() {
    return renderTs({
      tsPath: join(__dirname, 'demo.ts'),
      shims: ['events', 'buffer'],
      envVars: ['RECAPTCHA_SITE', 'RECAPTCHA_V2_SITE', 'GTAG_ID']
    });
  }
}