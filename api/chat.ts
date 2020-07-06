import { Chat } from '../lib/dto';
import { nlp, fetchJson, randomWord, responder } from '../lib/api/common';

export default responder<Chat.Request, Chat.Response>(async chatReq => {
  // Load the faqs json from the origin, see src/faqs.11ty.js
  const faqs = await fetchJson<{
    question: string;
    patterns: string[];
    summary: string;
    id: string;
  }[]>(new URL('faqs.json', chatReq.origin).toString());

  const msgDoc = nlp(chatReq.message);
  const match = faqs.map(faq =>({
    score: faq.patterns.filter(pattern => msgDoc.has(pattern)).length, faq
  })).filter(m => m.score > 0).sort((m1, m2) => m2.score - m1.score)[0];
  if (match != null) {
    return {
      message: `${match.faq.summary}<br>
      <a href="/#${match.faq.id}">See the FAQ here</a> (right-click to follow).`
    }
  }
  return {
    message: await randomWord('noun')
  }
});
