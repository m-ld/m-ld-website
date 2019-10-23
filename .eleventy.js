module.exports = function (eleventyConfig) {
    eleventyConfig.addPassthroughCopy({ 'src/favicon': 'favicon' });

    return {
        dir: { input: 'src' },
        templateFormats: ['html', 'svg', 'md', '11ty.js']
    }
}