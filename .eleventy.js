module.exports = function (eleventyConfig) {
    eleventyConfig.addPassthroughCopy({ 'node_modules/@fortawesome/fontawesome-free/webfonts': 'webfonts' });
    // Do not ghost events across browsers - defeats the point of m-ld
    eleventyConfig.setBrowserSyncConfig({ ghostMode: false });
    return {
        dir: { input: 'src' },
        templateFormats: ['html', 'svg', 'md', '11ty.js']
    }
}