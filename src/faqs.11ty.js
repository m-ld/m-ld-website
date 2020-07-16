/** @typedef { import('../lib/dto').FaqIndexEntry } FaqIndexEntry */

module.exports = class {
  data() {
    return {
      permalink: 'faqs.json'
    };
  }

  render({ collections }) {
    return JSON.stringify(collections.faq.map(
      faq => this.getFaqIndexEntry(faq)));
  }

  /**
   * @param {{ data: object, fileSlug: string }} faq Eleventy collection entry
   * @returns {FaqIndexEntry} index entry, see ../api/chat.ts
   */
  getFaqIndexEntry(faq) {
    return {
      //question: faq.data.question,
      patterns: faq.data.patterns,
      summary: faq.data.summary,
      id: faq.fileSlug
    };
  }
}