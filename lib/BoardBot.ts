import { MeldApi, Update, shortId, Subject, Resource } from '@m-ld/m-ld';
import { BoardIndex, MessageItem, MIN_MESSAGE_SIZE } from './BoardIndex';
import { Message } from './Message';
import { MeldUpdate } from '@m-ld/m-ld/dist/m-ld';

export interface BotBrain {
  answer(message: string, topMessages: string[]): Promise<string | null>;
}

export class BoardBot {
  private prevId: string;
  private myIds = new Set<string>();
  private thinking = false;

  constructor(
    private readonly name: string,
    private readonly welcomeId: string,
    private readonly meld: MeldApi,
    private readonly index: BoardIndex,
    private readonly brain: BotBrain) {
    this.prevId = welcomeId;
  }

  async start(isNew: boolean) {
    if (isNew) {
      await pause();
      await this.say(`For Help with this collaborative message board,
      <br>click the <i class="fas fa-question"></i> button.`, [2, 1.5]);
      await pause(4);
      await this.say([this.introId, `
      Hi! I'm a bot. My name is ${this.name}.<br>
      I'm here to talk about <b>m-ld</b>.<br>
      I'll start by explaining how this app works.<br>
      I'll also try to answer any questions.<br>
      If you delete this message I'll be quiet,<br>
      but I'll still answer if you mention my name.`], [2, 2.5], false);
    }
    if (await this.isChatting()) {
      // TODO: Topics!
      await pause(4);
    } else {
      // At startup, we might be a different bot on the same board.
      await pause();
      this.say([this.introId, `
      Hey, it's ${this.name}, checking in.<br>
      If you delete this message I'll be quiet,<br>
      but I'll still answer if you mention my name.`], [2, 2])
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

  private async maybeAnswer(update: MeldUpdate) {
    const chatting = await this.isChatting();
    const msg = update['@insert'].find(
      subject => subject['@id'] != null
        && !this.myIds.has(subject['@id']) // Not one of my own
        && msgText(subject) // Has some text
        && (chatting || this.addressedIn(msgText(subject))));
    if (msg != null) {
      // Pause for thought
      await pause(Math.random() * 3 + 1);
      const answer = await this.brain.answer(msgText(msg),
        this.index.topMessages(10, this.myIds));
      if (answer != null)
        await this.say(answer, [1, 1], true, msg['@id']);
    }
  }

  private addressedIn(text: string) {
    // Directly addressed in the given message text?
    return text.match(`(?:^|\\s)${this.name}(?:$|[^\\w])`);
  }

  private get introId(): string {
    return shortId(`${this.name}/intro`);
  }

  private async isChatting() {
    return (await this.meld.get(this.introId)) != null;
  }

  /**
   * @param what text to say, or tuple of [id, text]
   * @param size [width, height] relative to MIN_MESSAGE_SIZE
   * @param withLink whether to explicitly link from afterId
   * @param afterId message to follow, if not defined then the last thing said
   */
  private async say(
    what: string | [string, string],
    size: [number, number],
    withLink = true,
    afterId: string = this.prevId): Promise<void> {
    const [id, text] = Array.isArray(what) ? what : [shortId(), what];
    const [x, y] = this.index.findSpace(this.message(afterId),
      MIN_MESSAGE_SIZE.map((dim, i) => dim * size[i]) as [number, number]);
    const message: Message & Subject = {
      '@id': id, '@type': 'Message', text, x, y, linkTo: []
    };
    const link: Partial<Message> = {
      '@id': afterId, linkTo: [{ '@id': id }]
    };
    await this.meld.transact<Update>({
      '@insert': withLink ? [message, link] : message
    });
    this.myIds.add(this.prevId = id);
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
