import { MeldApi, Update, shortId, Subject, Resource } from '@m-ld/m-ld';
import { BoardIndex, MessageItem, MIN_MESSAGE_SIZE } from './BoardIndex';
import { Message } from './Message';
import { MeldUpdate } from '@m-ld/m-ld/dist/m-ld';
import { BotBrain, Sentiment, selectRandom } from './BotBrain';

type Topic = {
  text: string | ((bot: BoardBot) => string),
  size?: [number, number]
};
const SEE_HELP: Topic = {
  text: `
    For Help with this collaborative message board,
    <br>click the <i class="fas fa-question"></i> button.`,
  size: [2, 1.5]
}
const FIRST_GREETING: Topic = {
  text: bot => `
    Hi! I'm a bot. My name is ${bot.name}.<br>
    I'm here to talk about <b>m-ld</b>.<br>
    I'll start by explaining how this app works.<br>
    I'll also try to answer any questions.`,
  size: [2, 1.5]
};
const RETURN_GREETING: Topic = {
  text: bot => selectRandom(
    `Hey, it's ${bot.name}, checking in. I'm a bot.`,
    `Hi, it's bot ${bot.name}, still here.`,
    `Hello! ${bot.name} here, a bot, if you need me.`),
  size: [1.5, 1]
};
interface AppTopic extends Topic {
  next: AppTopicId[]
}
type AppTopicId = keyof typeof APP_TOPICS;
// The traversal of the topics is depth-first, so make sure that it's the
// right-most branch that terminates with the farewell.
const APP_TOPICS: {
  'what-is-this': AppTopic,
  'its-not-m-ld': AppTopic,
  'its-not-a-db': AppTopic,
  'try-browser-back': AppTopic,
  'try-incognito': AppTopic,
  'watch-sync': AppTopic,
  'sync-is-m-ld': AppTopic,
  'url-contains-domain': AppTopic,
  'for-more-detail': AppTopic
} = {
  'what-is-this': {
    text: `
      This is a message board app. You can create new messages and<br>
      edit the existing ones, and make new connections between messages.`,
    size: [2, 1.5],
    next: ['its-not-m-ld', 'its-not-a-db', 'try-incognito']
  },
  'its-not-m-ld': {
    text: `
      This app is not m-ld, but it uses a m-ld engine to store the data and share it.`,
    size: [2.5, 1],
    next: []
  },
  'its-not-a-db': {
    text: `
      This app doesn't use a database.<br>
      In fact this site is just statically served HTML and Javascript.`,
    size: [2, 1.5],
    next: ['try-browser-back']
  },
  'try-browser-back': {
    text: `
      If you use the browser Back button and return to the same screen,<br>
      you'll see that the whole message board is still here.`,
    size: [2, 1.5],
    next: []
  },
  'try-incognito': {
    text: `
      If you copy the browser URL, then open a new incognito window,<br>
      or a different browser, or on a different machine,<br>
      and navigate to that URL, you'll see the same message board.`,
    size: [3, 2],
    next: ['watch-sync']
  },
  'watch-sync': {
    text: `
      Now, if you or I make some changes...<br>
      you'll see the state of the boards staying synchronised.`,
    size: [2, 1.5],
    next: ['sync-is-m-ld']
  },
  'sync-is-m-ld': {
    text: `
      This sharing of state is achieved using m-ld.<br>
      There is no code in the app itself to communicate the data between the two boards.<br>
      Instead, the app just makes the changes it wants to the data,<br>
      and m-ld handles keeping the board data synchronised.`,
    size: [3, 2],
    next: ['url-contains-domain']
  },
  'url-contains-domain': {
    text: `
      m-ld is told by the app which boards should share the same data.<br>
      In this app, it's done using the URL fragment.`,
    size: [2, 1.5],
    next: ['for-more-detail']
  },
  'for-more-detail': {
    text: `
      That's all I'm going to say for now. You can ask me questions,<br>
      and I'll try to answer them (call me by name).<br>
      You can also head to the FAQ in the docs.<br>
      This board is yours to use, of course. Happy Messaging!`,
    size: [3, 2],
    next: []
  }
};

export class BoardBot {
  private prevId: string;
  private myIds = new Set<string>();
  private thinking = false;
  private chatting = false;

  constructor(
    readonly name: string,
    private readonly welcomeId: string,
    private readonly meld: MeldApi,
    private readonly index: BoardIndex,
    private readonly brain: BotBrain) {
    this.prevId = welcomeId;
  }

  async start(isNew: boolean) {
    if (isNew) {
      await pause();
      await this.say(SEE_HELP);
      await pause(4);
      await this.say([this.greetingId, FIRST_GREETING], false);
      // Topics
      await pause(4);
      const firstId = <AppTopicId>Object.keys(APP_TOPICS).find((id: AppTopicId) =>
        !Object.values(APP_TOPICS).some(topic => (topic.next ?? []).includes(id)));
      await this.sayAppTopic(firstId);
    }
    if ((await this.meld.get(this.greetingId)) == null) {
      // At startup, we might be a different bot on the same board.
      await pause();
      this.say([this.greetingId, RETURN_GREETING]);
    }
    // Set up chat in response to messages
    this.meld.follow().subscribe(update => {
      if (!this.thinking) {
        this.thinking = true;
        this.maybeAnswer(update)
          .catch(err => console.warn(err)) // TODO: Logging
          .finally(() => this.thinking = false);
      }
    });
  }

  private async sayAppTopic(id: AppTopicId, afterMsgId?: string) {
    const msgId = shortId(id);
    await this.say([msgId, APP_TOPICS[id]], true, afterMsgId);
    for (let next of APP_TOPICS[id].next) {
      await pause(3);
      // Check that the user hasn't deleted the previous message
      if ((await this.meld.get(msgId)) != null)
        await this.sayAppTopic(next, msgId);
    }
  }

  private async maybeAnswer(update: MeldUpdate) {
    const msg = update['@insert'].filter( // Check not one of my own
      subject => subject['@id'] != null && !this.myIds.has(subject['@id']))
      .map(subject => ({ '@id': subject['@id'], text: msgText(subject) }))
      .filter(msg => msg.text != null)
      .find(msg => msg && (this.chatting || this.addressedIn(msg.text)));
    if (msg != null) {
      // Pause for thought
      await pause();
      const answer = await this.brain.respond(msg.text,
        this.index.topMessages(10, this.myIds));
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

  private get greetingId(): string {
    return shortId(`${this.name}/intro`);
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
    const message: Message & Subject = {
      '@id': id, '@type': 'Message', text, x, y, linkTo: []
    };
    const link: Partial<Message> = {
      '@id': afterId, linkTo: [{ '@id': id }]
    };
    this.myIds.add(this.prevId = id);
    await this.meld.transact<Update>({
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

function msgText(subject: Subject): string {
  return MessageItem.mergeText((<Resource<Message>>subject).text);
}
