/**
 * 'Template' that runs sass and postcss to generate main.css
 */
const sass = require('node-sass');
const { join } = require('path');
const postcss = require('postcss');
const { promisify } = require('util');

module.exports = class {
  data() {
    return {
      permalink: 'main.css',
      scssPath: join(__dirname, '_includes/main.scss')
    }
  };

  async render({scssPath}) {
    return promisify(sass.render)({file: scssPath})
      .then(({css}) => postcss([require('autoprefixer')]).process(css));
  }
}