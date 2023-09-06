/**
 * 'Template' that runs browserify to generate storyboard/storyboard.js
 */
const { join } = require('path');
const { renderTs } = require('@m-ld/io-web-build');

module.exports = class {
  data() {
    return { permalink: 'storyboard/storyboard.js' };
  }
  render() {
    return renderTs({
      tsPath: join(__dirname, 'storyboard.ts'),
      shims: ['events', 'buffer', 'querystring'],
      envVars: ['RECAPTCHA_SITE', 'RECAPTCHA_V2_SITE', 'GTAG_ID']
    });
  }
};