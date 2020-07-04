/**
 * 'Template' that runs browserify to generate bundle.js
 */
const { join } = require('path');
const browserify = require('browserify');
const { promisify } = require('util');
const tsconfig = require('../tsconfig.json');

module.exports = class {
  data() {
    return {
      permalink: 'demo/demo.js',
      tsPath: join(__dirname, '_includes/demo.ts')
    }
  };

  async render({ tsPath }) {
    if (process.env.LIVE_DEMO) {
      // TODO: Remove debug for production
      var b = browserify(tsPath, { debug: true })
        .plugin('tsify', tsconfig.compilerOptions)
        .transform(require('envify'));
      return promisify(b.bundle.bind(b))();
    }
  }
}