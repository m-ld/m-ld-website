const { join } = require('path');
const { default11tyConfig, packageDir } = require('@m-ld/io-web-build');

/**
 * @param {import('@11ty/eleventy').UserConfig} config
 * @returns {*}
 */
module.exports = function (config) {
  const jsoneditorDist = join(packageDir('jsoneditor', require), 'dist');
  config.addPassthroughCopy('src/media');
  config.addPassthroughCopy({
    [join(jsoneditorDist, 'jsoneditor.min.css')]: 'jsoneditor.min.css',
    [join(jsoneditorDist, 'img', 'jsoneditor-icons.svg')]: 'img/jsoneditor-icons.svg'
  });
  console.log('Building in Vercel environment', process.env.VERCEL_ENV)
  if (process.env.VERCEL_ENV !== 'production') {
    config.addTransform('edge-links', function (content) {
      if (this.page.outputPath?.endsWith('.html'))
        return content.replaceAll(/https:\/\/(js|spec)\.m-ld\.org/g, 'https://edge.$1.m-ld.org');
      else
        return content;
    });
  }
  return default11tyConfig(config);
};