import { MeldClone, Update, shortId } from '@m-ld/m-ld';
import { BoardIndex, MIN_MESSAGE_SIZE } from './BoardIndex';
import { MessageSubject, MessageItem, splitHtml } from './Message';
import { BotBrain, Sentiment, selectRandom } from './BotBrain';

type Topic = {
  text: string | ((bot: BoardBot) => string),
  size?: [number, number]
};
const SEE_HELP: Topic = {
  text: `
    For Help with this collaborative message board,
    <br>click the Help (?) button.`,
  size: [2, 1.5]
}
const FIRST_GREETING: Topic = {
  text: bot => `
    Hi! I'm a bot. My name is ${bot.name}.<br>
    I'm here to talk about <b>m-ld</b>.<br>
    You can stop me by deleting this message!`,
  size: [2, 1.5]
};
const RETURN_GREETING: Topic = {
  text: bot => selectRandom(
    `Hey, it's ${bot.name}, checking in. I'm a bot.`,
    `Hi, it's bot ${bot.name}, I'm here.`,
    `Hello! ${bot.name} here, a bot, if you need me.`),
  size: [1.5, 1]
};
interface AppTopic extends Topic {
  id: AppTopicId,
  linkFrom?: AppTopicId
}
type AppTopicId =
  'what-is-this' |
  'its-not-m-ld' |
  'its-not-a-db' |
  'try-browser-back' |
  'try-incognito' |
  'watch-sync' |
  'sync-is-m-ld' |
  'url-contains-domain' |
  'for-more-detail';
const APP_TOPICS: AppTopic[] = [{
  id: 'what-is-this',
  text: `
    This is a message board app. You can create new messages and<br>
    edit the existing ones, and make new connections between messages.`,
  size: [2, 1.5]
}, {
  id: 'its-not-m-ld',
  text: `
    This app is not m-ld, but it uses a m-ld engine to store the data and share it.`,
  size: [2.5, 1],
  linkFrom: 'what-is-this'
}, {
  id: 'its-not-a-db',
  text: `
    This app doesn't use a database.<br>
    In fact this site is just statically served HTML and Javascript.`,
  size: [2, 1.5],
  linkFrom: 'what-is-this'
}, {
  id: 'try-browser-back',
  text: `
    If you use the browser Back button and return to the same screen,<br>
    you'll see that the whole message board is still here.`,
  size: [2, 1.5],
  linkFrom: 'its-not-m-ld'
}, {
  id: 'try-incognito',
  text: `
    If you copy the browser URL, then open a new incognito window,<br>
    or a different browser, or on a different machine,<br>
    and navigate to that URL, you'll see the same message board.`,
  size: [3, 2],
  linkFrom: 'its-not-m-ld'
}, {
  id: 'watch-sync',
  text: `
    Now, if you or I make some changes...<br>
    you'll see the state of the boards staying synchronised.`,
  size: [2, 1.5],
  linkFrom: 'try-incognito'
}, {
  id: 'sync-is-m-ld',
  text: `
    This sharing of state is achieved using m-ld.<br>
    There is no code in the app itself to communicate the data between the two boards.<br>
    Instead, the app just makes the changes it wants to the data,<br>
    and m-ld handles keeping the board data synchronised.`,
  size: [3, 2],
  linkFrom: 'watch-sync'
}, {
  id: 'url-contains-domain',
  text: `
    m-ld is told by the app which boards should share the same data.<br>
    In this app, it's done using the URL fragment.`,
  size: [2, 1.5],
  linkFrom: 'sync-is-m-ld'
}, {
  id: 'for-more-detail',
  text: `
    That's all I'm going to say for now. You can ask me questions,<br>
    and I'll try to answer them (call me by name).<br>
    You can also head to the FAQ in the docs.<br>
    This board is yours to use, of course. Happy Messaging!`,
  size: [3, 2],
  linkFrom: 'what-is-this'
}];

export class BoardBot {
  private prevId: string;
  private myIds = new Set<string>();
  private thinking = false;
  private chatting = false;

  constructor(
    readonly name: string,
    private readonly welcomeId: string,
    private readonly meld: MeldClone,
    private readonly index: BoardIndex,
    private readonly brain: BotBrain) {
    this.prevId = welcomeId;
  }

  async start(isNew: boolean) {
    if (isNew) {
      await pause();
      await this.say(SEE_HELP);
      await pause(4);
      await this.say([this.greetingId('initial'), FIRST_GREETING], false);
    }
    if ((await Promise.all(['initial', 'return']
      .map((id: 'initial' | 'return') => this.meld.get(this.greetingId(id)))))
      .every(greeting => greeting == null)) {
      // At startup, we might be a different bot on the same board.
      await pause();
      await this.say([this.greetingId('return'), RETURN_GREETING]);
    }
    // Set up chat in response to messages
    this.index.on('insert', items => {
      if (!this.thinking) {
        this.thinking = true;
        this.maybeAnswer(items)
          .catch(err => console.warn(err)) // TODO: Logging
          .finally(() => this.thinking = false);
      }
    });
    await pause(4);
    // Keep going with the exposition if desired
    this.sayTopics();
  }

  private async sayTopics() {
    const initialGreetingId = this.greetingId('initial');
    for (let appTopic of APP_TOPICS) {
      const msgId = shortId(appTopic.id);
      const afterId = appTopic.linkFrom != null ?
        shortId(appTopic.linkFrom) : initialGreetingId;

      const [greeting, msg, after] = await Promise.all(
        [initialGreetingId, msgId, afterId].map(id => this.meld.get(id)));

      if (greeting != null && after != null) {
        if (msg == null) {
          await this.say([msgId, appTopic], true, afterId);
          // await pause(4); // Pause after saying anything
          break; // TODO
        }
      } else {
        // User is deleting messages, probably doesn't want us around
        break;
      }
    }
  }

  private async maybeAnswer(items: MessageItem[]) {
    // Check not one of my own
    const msg = items.find(msg => !this.myIds.has(msg['@id']) &&
      msg.text && (this.addressedIn(msg.text) || this.chatting));
    if (msg != null) {
      // Pause for thought
      await pause(Math.random());
      const answer = await this.brain.respond(msg.text,
        this.index.topMessages(10, this.myIds).map(stripTags));
      if (answer.message != null)
        await this.say({ text: answer.message, size: [1, 1] }, true, msg['@id']);
      if (answer.sentiment.includes(Sentiment.START_CHAT))
        this.chatting = true;
      if (answer.sentiment.includes(Sentiment.STOP_CHAT))
        this.chatting = false;
    }
  }

  private addressedIn(text: string) {
    // Directly addressed in the given message text?
    return text.match(`(?:^|\\s)${this.name}(?:$|[^\\w])`);
  }

  private greetingId(initial: 'initial' | 'return'): string {
    return shortId(`${this.name}/intro/${initial}`);
  }

  /**
   * @param what text to say, or tuple of [id, text]
   * @param size [width, height] relative to MIN_MESSAGE_SIZE
   * @param withLink whether to explicitly link from afterId
   * @param afterId message to follow, if not defined then the last thing said
   */
  private async say(
    what: Topic | [string, Topic],
    withLink = true,
    afterId: string = this.prevId): Promise<void> {
    const [id, topic] = Array.isArray(what) ? what : [shortId(), what];
    const text = typeof topic.text == 'function' ? topic.text(this) : topic.text;
    const size = topic.size ?? [1, 1];
    const [x, y] = this.index.findSpace(this.message(afterId),
      MIN_MESSAGE_SIZE.map((dim, i) => dim * size[i]) as [number, number]);
    const message = MessageSubject.create({ '@id': id, text, x, y });
    const link: Partial<MessageSubject> = {
      '@id': afterId, linkTo: [{ '@id': id }]
    };
    this.myIds.add(this.prevId = id);
    await this.meld.write<Update>({
      '@insert': withLink ? [message, link] : message
    });
  }

  private message(id: string): MessageItem {
    return this.index.get(id) ?? this.message(this.welcomeId);
  }
}

function pause(seconds: number = 2) {
  return new Promise(res => setTimeout(res, seconds * 1000));
}

function stripTags(html: string): string {
  return splitHtml(html, text => text, _tag => '').join('');
}