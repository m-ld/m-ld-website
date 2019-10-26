module.exports = function (eleventyConfig) {
    eleventyConfig.addPassthroughCopy({ 'node_modules/@fortawesome/fontawesome-free/webfonts': 'webfonts' });

    return {
        dir: { input: 'src' },
        templateFormats: ['html', 'svg', 'md', '11ty.js']
    }
}