export default (function () {
  // Browserify does not support dynamic require
  switch (process.env.NODE_ENV) {
    case 'local': return require('./local.json');
    case 'test': return require('./test.json');
  }
})();