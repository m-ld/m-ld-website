/**
 * 'Template' that runs browserify to generate playground/playground.js
 */
const { join } = require('path');
const { renderTs } = require('@m-ld/io-web-build');

module.exports = class {
  data() {
    return {
      permalink: 'playground/playground.js',
      tsPath: join(__dirname, 'playground.ts'),
      tsConfig: require('../tsconfig.json')
    };
  }
  render() {
    return renderTs.apply(this, arguments);
  }
}