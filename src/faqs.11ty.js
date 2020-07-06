module.exports = class {
  data() {
    return {
      permalink: 'faqs.json'
    };
  }

  render({ collections }) {
    return JSON.stringify(collections.faq.map(faq => ({
      question: faq.data.question,
      patterns: faq.data.patterns,
      summary: faq.data.summary,
      id: faq.fileSlug
    })));
  }
}