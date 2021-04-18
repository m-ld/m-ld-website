import { MeldClone, Update, shortId } from '@m-ld/m-ld';
import { BoardIndex, MIN_MESSAGE_SIZE } from './BoardIndex';
import { MessageSubject, MessageItem, splitHtml } from './Message';
import { BotBrain, Sentiment, selectRandom } from './BotBrain';
import { fromEvent } from 'rxjs';
import { buffer, debounceTime, map } from 'rxjs/operators';

/**
 * As of 18-Apr-21, the board bot is deactivated.
 * 
 * Thanks for your service guys.
 */

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
    Hi! I'm a bot. My name is ${bot.name}.`,
  size: [2, 1.5]
};
const RETURN_GREETING: Topic = {
  text: bot => selectRandom(
    `Hey, it's ${bot.name}, checking in. I'm a bot.`,
    `Hi, it's bot ${bot.name}, I'm here.`,
    `Hello! ${bot.name} here, a bot, if you need me.`),
  size: [1.5, 1]
};

export class BoardBot {
  private prevId: string;
  private myIds = new Set<string>();
  private chatting = false;

  constructor(
    readonly name: string,
    private readonly welcomeId: string,
    private readonly meld: MeldClone,
    private readonly index: BoardIndex,
    private readonly brain: BotBrain,
    private readonly onError: (err: any) => void) {
    this.prevId = welcomeId;
  }

  async start(isNew: boolean) {
    // Wait for the welcome Id to be available in the index
    while (this.index.get(this.welcomeId) == null)
      await pause();
    if (isNew) {
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
    // Set up chat in response to updated messages
    const messageUpdates = fromEvent<MessageItem>(this.index, 'update');
    messageUpdates.pipe(
      // Buffer while debouncing
      buffer(messageUpdates.pipe(debounceTime(3000))),
      map(changedMsgs => {
        for (let changedMsg of changedMsgs) {
          const currentMsg = this.index.get(changedMsg['@id']);
          if (this.shouldAnswer(currentMsg, changedMsg))
            return currentMsg;
        }
      }))
      .subscribe(msg => this.answer(msg).catch(this.onError));
  }

  private shouldAnswer(msg: MessageItem | undefined, old: MessageItem) {
    // Change of non-empty text
    return msg?.text && msg.text !== old.text &&
      // Not one of my own messages
      !this.myIds.has(msg['@id']) &&
      // Being addressed or feeling chatty
      (this.addressedIn(msg.text) || this.chatting);
  }

  private async answer(msg?: MessageItem) {
    if (msg != null) {
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
    return text.match(`(?:^|\\s)${this.name}(?:$|[^\\w])`) != null;
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