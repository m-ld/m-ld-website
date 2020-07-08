import { NlpBrain } from '../lib/api/NlpBrain';
import { Answer, Sentiment } from '../lib/BotBrain';

declare global {
  namespace jest {
    interface Matchers<R> {
      answerWith(match: RegExp | Sentiment): jest.CustomMatcherResult;
    }
  }
}

expect.extend({
  answerWith: (answer: Answer, match: RegExp | Sentiment) => {
    let pass: boolean;
    if (typeof match == 'object') {
      pass = answer.message != null &&
        !!answer.message.split('<br>').find(ph => ph.match(match));
    } else {
      pass = answer.sentiment.includes(match);
    }
    return { pass, message: () => `expected ${answer.message} to contain ${match}` }
  }
});

it('answers an FAQ question', async () => {
  const answer = await new NlpBrain('Fred', [{
    question: 'About Security',
    patterns: ['security'],
    summary: 'Security matters!',
    id: 'about-security'
  }]).respond('security', []);
  expect(answer).answerWith(/Security matters/);
  expect(answer).answerWith(/about-security/);
  expect(answer).answerWith(/FAQ/);
});

it('answers a greeting', async () => {
  expect(await new NlpBrain('Fred', []).respond('Hi Fred', []))
    .answerWith(/Hi/);
  expect(await new NlpBrain('Fred', []).respond('Hello Fred', []))
    .answerWith(/Hello/);
});

it('answers a greeted FAQ question', async () => {
  const answer = await new NlpBrain('Fred', [{
    question: 'About Security',
    patterns: ['security'],
    summary: 'Security matters!',
    id: 'about-security'
  }]).respond('Hi Fred! Talk about security', []);
  expect(answer).answerWith(/Hi/);
  expect(answer).answerWith(/Security matters/);
});

it('knows when to chat', async () => {
  expect(await new NlpBrain('Fred', []).respond('Fred, talk', []))
    .answerWith(Sentiment.START_CHAT);
});

it('knows when to stop chat', async () => {
  expect(await new NlpBrain('Fred', []).respond('Fred please shush', []))
    .answerWith(Sentiment.STOP_CHAT);
});

function expectMessageWith(answer: Answer, regex: RegExp) {
  if (answer.message == null)
    fail();
  else
    expect(answer.message.split('<br>').find(ph => ph.match(regex))).toBeDefined();
}
