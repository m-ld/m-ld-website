/**
 * 'Template' that runs browserify to generate bundle.js
 */
const { join } = require('path');
const browserify = require('browserify');
const { promisify } = require('util');
const fs = require("fs");

module.exports = class {
  data() {
    return {
      permalink: 'bundle.js',
      jsPath: join(__dirname, '_includes/main.js')
    }
  };

  async render({ jsPath }) {
    var b = browserify();
    b.add(jsPath);
    return promisify(b.bundle.bind(b))();
  }
}