module.exports = function (config) {
    config.addPassthroughCopy({
        'node_modules/@fortawesome/fontawesome-free/webfonts': 'webfonts'
    });
    config.addPassthroughCopy('src/modernizr-custom.js');
    // Do not ghost events across browsers - defeats the point of m-ld
    config.setBrowserSyncConfig({ ghostMode: false });
    config.setLiquidOptions({
        dynamicPartials: true
    });
    return {
        dir: { input: 'src' },
        templateFormats: ['liquid', 'html', 'svg', 'png', 'md', '11ty.js']
    }
}