module.exports = function (eleventyConfig) {
    eleventyConfig.addPassthroughCopy({ 'src/favicon': 'favicon' });

    return {
        dir: { input: 'src', output: 'public' },
        templateFormats: ['html', 'svg', 'md']
    }
}