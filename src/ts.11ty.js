/**
 * 'Template' that runs browserify to generate bundle.js
 */
const { join } = require('path');
const browserify = require('browserify');
const { promisify } = require('util');

module.exports = class {
  data() {
    return {
      permalink: 'demo/demo.js',
      tsPath: join(__dirname, '_includes/demo.ts')
    }
  };

  async render({ tsPath }) {
    var b = browserify().add(tsPath).plugin("tsify", { noImplicitAny: true });
    return promisify(b.bundle.bind(b))();
  }
}