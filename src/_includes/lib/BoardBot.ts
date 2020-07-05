import { MeldApi, Update, shortId, Subject } from '@m-ld/m-ld';
import { BoardIndex, MessageItem } from './BoardIndex';
import { Message } from './Message';

export class BoardBot {
  private prevId: string;
  private name: string;

  constructor(
    defaultName: string,
    private readonly welcomeId: string,
    private readonly meld: MeldApi,
    private readonly index: BoardIndex) {
    this.prevId = welcomeId;
    this.name = defaultName;
  }

  async start(isNew: boolean) {
    await pause();
    if (isNew) {
      await this.say(`For Help with this collaborative message board,
      <br>click the <i class="fas fa-question"></i> button.`);
      await pause(4);
      await this.say(['chooseTopic', `<p>Hi! I'm a bot. My name is ${this.name}.</p>
      <p>I'm here to talk about how <b>m-ld</b> works.
      <p>If you want me to be quiet, just delete my messages.</p>
      Otherwise I'll talk about:<ul>
      <li>Sharing a board</li>
      <li><b>m-ld</b></li>
      <li>Disagreements</li>
      <li>Anything else that I think of.</li></ul>`], false);
    }
    await pause(4);
    if ((await this.meld.get('chooseTopic')) != null) {

    }
  }

  private async say(
    what: string | [string, string],
    withLink = true,
    afterId: string = this.prevId): Promise<unknown> {
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
    return this.prevId = id;
  }

  private message(id: string): MessageItem {
    return this.index.all().filter(item => item['@id'] === id)[0]
      ?? this.message(this.welcomeId);
  }
}

function pause(seconds: number = 2) {
  return new Promise(res => setTimeout(res, seconds * 1000));
}
