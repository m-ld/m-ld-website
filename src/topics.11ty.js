/** @typedef { import('../lib/dto').TopicIndexEntry } TopicIndexEntry */

/**
 * This template is for pushing the `topic` data collection to the index file at
 * `/topics.json`.
 */
module.exports = class {
  data() {
    return {
      permalink: 'topics.json'
    };
  }

  render({ collections }) {
    return JSON.stringify(collections.topic.map(
      topic => this.getTopicIndexEntry(topic)));
  }

  /**
   * @param {{ data: object, fileSlug: string }} topic Eleventy collection entry
   * @returns {TopicIndexEntry} index entry, see ../api/chat.ts
   */
  getTopicIndexEntry(topic) {
    return {
      //title: topic.data.title,
      patterns: topic.data.patterns,
      summary: topic.data.summary,
      id: topic.fileSlug
    };
  }
}