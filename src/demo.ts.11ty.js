/**
 * 'Template' that runs browserify to generate demo/demo.js
 */
const { join } = require('path');
const { renderTs } = require('@m-ld/io-web-build');

module.exports = class {
  data() {
    return {
      permalink: 'demo/demo.js',
      tsPath: join(__dirname, 'demo.ts'),
      tsConfig: require('../tsconfig.json')
    };
  }
  render() {
    return renderTs.apply(this, arguments);
  }
}