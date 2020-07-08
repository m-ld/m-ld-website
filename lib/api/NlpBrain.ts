import { FaqIndexEntry } from '../dto';
import nlp from 'compromise';
import { BotBrain, Sentiment, Answer, selectRandom } from '../BotBrain';

interface Thought extends Answer {
  score: number
};
type MiniBrain = {
  patterns: string[],
  respond: (matching: ReturnType<nlp.Document['groups']>, index: number) => Thought
};

export class NlpBrain implements BotBrain {
  readonly message: nlp.Document;
  readonly brain: MiniBrain[];

  constructor(
    private readonly botName: string,
    faqs: FaqIndexEntry[]) {
    this.botName = botName;
    // TODO: Limit message size for recursion
    const faqBrain: MiniBrain[] = faqs.map(faq => ({
      patterns: ['(m-ld|mld|meld)'].concat(faq.patterns),
      respond: () => ans(2, faq.summary,
        `<a href="/#${faq.id}">See the FAQ</a> (right-click to follow).`)
    }));
    const chatBrain: MiniBrain[] = [{
      patterns: [`[#Expression] .? ${this.botName}`],
      respond: groups => ans(1, `${groups[0].text()}!`, Sentiment.START_CHAT)
    }, {
      patterns: [`^[#Expression]$`],
      respond: groups => ans(1, `${groups[0].text()}, I'm still here.`)
    }, {
      patterns: [`what is your name`],
      respond: () => ans(1, `My name is ${this.botName}.`)
    }, {
      patterns: [`I want (a|some)? [#Noun]`],
      respond: groups => ans(1, `You shall have ${groups[0].text()}.`)
    }, {
      patterns: [`would you like (some|any)? [#Noun]`, `do you want (some|any)? [#Noun]`],
      respond: groups => ans(1, `With ${groups[0].text()} I will rule the world!`)
    }, {
      patterns: [`${this.botName} * [(quiet|shush|shh|sh|stfu|shut)]`],
      respond: groups => ans(1, `OK, ${groups[0].text()}-ing.`, Sentiment.STOP_CHAT)
    }, {
      patterns: [`${this.botName} * (talk|chat)`, `${this.botName} * (talk|chat) * [#Noun]`],
      respond: (groups, i) => ans(i + 1, i ? `text:word.json/${groups[0].text()}/topExample` :
        `OK! What about?`, Sentiment.START_CHAT)
    }, {
      patterns: [`(talk|chat) about [#Noun]`],
      respond: groups => ans(1, `text:word.json/${groups[0].text()}/topExample`)
    }, {
      patterns: [`your favourite [#Noun]`],
      respond: groups => ans(1, `It's "words:word.json/${groups[0].text()}/relatedWords?useCanonical=true&relationshipTypes=synonym&limitPerRelationshipType=10"`)
    }, {
      patterns: [`^[#Noun]$`],
      respond: groups => ans(1, `${groups[0].text().replace(/[\!?\.]/g, '')}?`)
    }, {
      patterns: [`do you . (#Noun|#Verb)`],
      respond: () => ans(1, selectRandom('Yes!', 'No', 'Nope', 'Yep'))
    }, {
      patterns: [`are you (a|the) (robot|bot|android)`],
      respond: () => ans(1, selectRandom('Yes!', 'Yep'))
    }, {
      patterns: [`I like #Noun`],
      respond: () => ans(1, `OK. I like word:words.json/randomWord?includePartOfSpeech=noun`)
    }, {
      patterns: [`I like #Verb`],
      respond: () => ans(1, `OK. I like word:words.json/randomWord?includePartOfSpeech=verb`)
    }, {
      patterns: [`(die|death|kill|killed)`],
      respond: () => ans(1, `That's sad. You probably should talk to someone real about it.`)
    }, {
      patterns: [`how old are you`],
      respond: () => ans(1, `${Math.floor(process.uptime() / 1000)} seconds.`)
    }, {
      patterns: [`new box`],
      respond: () => ans(1, '')
    }];
    this.brain = (faqBrain).concat(chatBrain);
  }

  async respond(message: string, _topMessages: string[]): Promise<Answer> {
    return best(this.think(nlp(message))) ?? { message: null, sentiment: [] };
  }

  think(doc: nlp.Document,
    omit: Set<number> = new Set): Thought[] {
    return flatDense<Thought>(this.brain.filter((_, i) => !omit.has(i))
      .map(({ patterns, respond }, miniBrainIndex) => {
        // For each pattern, find a match then look ahead and behind, excluding
        // this minibrain, to prevent repeated matches.
        const nowOmit = new Set(omit);
        nowOmit.delete(miniBrainIndex);
        const perPattern = patterns.map((pattern, patternIndex) => {
          const matching = doc.match(pattern); // Captures groups
          if (matching.found) {
            const answer = respond(matching.groups(), patternIndex);
            return [answer]
              .concat(this.think(doc.ifNo(pattern), nowOmit).map(
                more => ({
                  score: more.score + 1,
                  message: `${answer.message}<br>${more.message}`,
                  sentiment: answer.sentiment.concat(more.sentiment)
                })));
          }
        });
        // Everyone's score increases by the number of patterns matched
        return flatDense<Thought>(perPattern)
          .map(thought => ({ ...thought, score: thought.score + perPattern.length }));
      }));
  };
}

function best(thoughts: Thought[]): Thought | null {
  let bestThought: Thought | null = null;
  for (let thought of thoughts) {
    if (thought.score > 0 && (bestThought == null || thought.score > bestThought.score))
      bestThought = thought;
  }
  return bestThought;
}

function flatDense<T>(bumpy: (T | T[] | undefined)[]): T[] {
  const defined = bumpy.filter(b => b != null) as (T | T[])[];
  return ([] as T[]).concat(...defined);
}

function ans(score: number, ...mindStuff: (string | Sentiment)[]): Thought {
  return {
    score,
    message: mindStuff.filter(stuff => typeof stuff == 'string').join('<br>'),
    sentiment: mindStuff.filter(s => typeof s == 'number') as Sentiment[]
  }
}