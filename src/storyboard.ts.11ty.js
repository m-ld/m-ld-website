/**
 * 'Template' that runs browserify to generate storyboard/storyboard.js
 */
const { join } = require('path');
const { renderTs } = require('@m-ld/io-web-build');

module.exports = class {
  data() {
    return {
      permalink: 'storyboard/storyboard.js',
      tsPath: join(__dirname, 'storyboard.ts'),
      tsConfig: require('../tsconfig.json')
    };
  }
  render() {
    return renderTs.apply(this, arguments);
  }
}