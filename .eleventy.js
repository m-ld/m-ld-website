const { join } = require('path');
const { default11tyConfig, packageDir } = require('@m-ld/io-web-build');

module.exports = function (config) {
  const jsoneditorDist = join(packageDir('jsoneditor', require), 'dist');
  config.addPassthroughCopy({
    [join(jsoneditorDist, 'jsoneditor.min.css')]: 'jsoneditor.min.css',
    [join(jsoneditorDist, 'img', 'jsoneditor-icons.svg')]: 'img/jsoneditor-icons.svg'
  });
  return default11tyConfig(config);
};