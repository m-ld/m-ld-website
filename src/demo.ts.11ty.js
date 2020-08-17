/**
 * 'Template' that runs browserify to generate bundle.js
 */
const { join } = require('path');
const browserify = require('browserify');
const { promisify } = require('util');
const tsconfig = require('../tsconfig.json');
const minify = require('minify-stream');
const concat = require('concat-stream');

module.exports = class {
  data() {
    return {
      permalink: 'demo/demo.js',
      tsPath: join(__dirname, '_includes/demo.ts')
    }
  };

  async render({ tsPath }) {
    const dev = process.env.NODE_ENV == 'development';
    let b = browserify(tsPath, { debug: dev })
      .plugin('tsify', tsconfig.compilerOptions)
      .transform('envify', { global: true });
    
    return new Promise((resolve, reject) => {
      const demoJs = concat(resolve);
      let demoStream = b.bundle();
      if (!dev)
        demoStream = demoStream.pipe(minify({ sourceMap: false }));

      demoStream.on('error', reject);
      demoStream.pipe(demoJs);
    });
  }
}