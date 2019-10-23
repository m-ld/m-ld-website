/**
 * 'Template' that runs browserify to generate bundle.js
 */
const { join } = require('path');
const browserify = require('browserify');
const tsify = require('tsify');
const { promisify } = require('util');
const fs = require("fs");

module.exports = class {
  data() {
    return {
      permalink: 'demo/demo.js',
      jsPath: join(__dirname, '_includes/demo.ts')
    }
  };

  async render({ jsPath }) {
    var b = browserify().add(jsPath).plugin("tsify", { noImplicitAny: true });
    return promisify(b.bundle.bind(b))();
  }
}