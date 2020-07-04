import { MeldApi, Update, shortId } from '@m-ld/m-ld';
import { BoardIndex, MessageItem } from './BoardIndex';
import { Message } from './Message';

export class BoardBot {
  private prevId: string;

  constructor(
    private readonly name: string,
    private readonly welcomeId: string,
    private readonly model: MeldApi,
    private readonly index: BoardIndex) {
    this.prevId = welcomeId;
  }

  async start(isNew: boolean) {
    await pause();
    if (isNew) {
      await this.say(`<p>This is your new collaborative message board.</p>
      <p>We'll use it to demonstrate how <b>m-ld</b> works.</p>`);
      await pause();
      await this.say(`For Help with using the board,<br>click the <i class="fas fa-question"></i> button.`);
      await pause();
      await this.say(['chooseTopic', `<p>My name is ${this.name}.</p>
      <p>If you want me to be quiet, just tell me with new message like '${this.name}, shush'.</p>
      Otherwise I'll talk about:<ul>
      <li>Sharing a board</li>
      <li><b>m-ld</b></li>
      <li>Disagreements</li>
      <li>Anything else that I think of.</li></ul>
      <p>If you want me to talk about something again, just ask in a new message.</p>`]);
    }
    await this.model.get('chooseTopic');
  }

  private async say(
    text: string | [string, string],
    afterId: string = this.prevId): Promise<unknown> {
    let id: string;
    if (Array.isArray(text)) {
      id = text[0];
      text = text[1];
    } else {
      id = shortId();
    }
    const [x, y] = this.index.findSpace(this.message(afterId));
    await this.model.transact<Update>({
      '@insert': [<Message>{
        '@id': id,
        '@type': 'Message',
        text, x, y,
        linkTo: []
      }, <Partial<Message>>{
        '@id': afterId, linkTo: [{ '@id': id }]
      }]
    });
    return this.prevId = id;
  }

  private message(id: string): MessageItem {
    return this.index.all().filter(item => item['@id'] === id)[0]
      ?? this.message(this.welcomeId);
  }
}

function pause(duration = 2000) {
  return new Promise(res => setTimeout(res, duration));
}
