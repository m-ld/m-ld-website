import { MeldApi, Update, shortId, Subject, Resource } from '@m-ld/m-ld';
import { BoardIndex, MessageItem } from './BoardIndex';
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
      <br>click the <i class="fas fa-question"></i> button.`);
      await pause(4);
      await this.say([this.introId, `
      Hi! I'm a bot. My name is ${this.name}.<br>
      I'm here to talk about <b>m-ld</b>.<br>
      I'll start by explaining how this app works.<br>
      I'll also try to answer any questions.<br>
      Delete this message to remove me.`], false);
    }
    if (await this.present()) {
      // TODO: Topics!
      await pause(4);
    } else {
      // At startup, we might be a different bot on the same board.
      await pause();
      this.say([this.introId, `
      Hey, it's ${this.name}, checking in.<br>
      Delete this message if you don't want me around.`])
    }
    // Set up chat in response to messages
    const chatSub = this.meld.follow().subscribe(async update => {
      if (!this.thinking) {
        this.thinking = true;
        try {
          if (await this.present()) { // Still wanted
            await this.maybeAnswer(update);
          } else {
            chatSub.unsubscribe();
          }
        } catch (err) {
          console.warn(err); // TODO logging
        } finally {
          this.thinking = false;
        }
      }
    });
  }

  private async maybeAnswer(update: MeldUpdate) {
    const msg = <Resource<Message> | undefined>update['@insert'].find(
      subject => subject['@id'] != null
        && !this.myIds.has(subject['@id']) // Not one of my own
        && MessageItem.mergeText((<Resource<Message>>subject).text)); // Has some text
    if (msg != null) {
      // Pause for thought
      await pause(Math.random() * 3 + 1);
      const answer = await this.brain.answer(
        MessageItem.mergeText(msg.text),
        this.index.topMessages(10, this.myIds));
      if (answer != null)
        await this.say(answer, true, msg['@id']);
    }
  }

  private get introId(): string {
    return shortId(`${this.name}/intro`);
  }

  private async present() {
    return (await this.meld.get(this.introId)) != null;
  }

  private async say(
    what: string | [string, string],
    withLink = true,
    afterId: string = this.prevId): Promise<void> {
    const [id, text] = Array.isArray(what) ? what : [shortId(), what];
    const [x, y] = this.index.findSpace(this.message(afterId));
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
