import * as d3 from 'd3';
import { setAttr, d3Selection, node } from './util';
import { BoardView } from './BoardView';
import { Rectangle } from './Shapes';
import { GroupView } from './D3View';
import { LinkView } from './LinkView';
import { MessageItem } from './BoardIndex';
import { Resource } from '@m-ld/m-ld';
import { Message } from './Message';

const MIN_MESSAGE_WIDTH: number = 115; // Width of buttons + 20

export class MessageView extends GroupView<MessageItem> {
  readonly boardView: BoardView;

  constructor(node: Element, boardView: BoardView) {
    super(MessageView.messageParent(node));
    this.boardView = boardView;
  }

  get msg(): MessageItem {
    return this.d3.datum();
  }

  private setMsg(msg: MessageItem) {
    this.d3.datum(msg);
  }

  get box(): d3Selection<SVGRectElement, MessageItem> {
    return this.d3.select('.board-message-box');
  }

  get body(): d3Selection<SVGForeignObjectElement, MessageItem> {
    return this.d3.select('.board-message-body');
  }

  get content(): d3Selection<HTMLDivElement, MessageItem> {
    return this.body.select('div');
  }

  static init(data: Resource<Message>) {
    const item = new MessageItem(data);
    const msgD3 = d3.select(MessageView.createMessageViewNode())
      .classed('board-message', true)
      .attr('id', data['@id'])
      // We don't yet know the message size
      .datum(item);
    msgD3.select('.board-message-body > div')
      .text(item.text)
    return msgD3;
  }

  update(data?: Resource<Message>): Promise<void> {
    if (data != null) {
      // Detect if the message has become invalid (deleted)
      this.setMsg(new MessageItem(data));
      if (this.msg.deleted) {
        this.d3.remove();
        // Remove all link-lines from and to the removed messsage
        LinkView.remove(this.allOutLinks);
        LinkView.remove(this.allInLinks);
        return Promise.resolve(); // Nothing else to do
      } else {
        // Update the visible text - but not if the user is editing
        if (document.activeElement !== node(this.content))
          this.updateText();
        // Update the position
        this.position = this.msg.position;
      }
    }
    // We push the re-sizing to the next frame because Firefox sometimes hasn't
    // updated the bounding client rect yet.
    return new Promise((resolve, reject) => {
      window.requestAnimationFrame(async () => {
        try {
          // Size the shape to the content
          const textRect = this.boardView.svgRect(node(this.content));
          // Chromium bug: The computed effective zoom is currently force-set to 1.0
          // for foreignObjects. We can detect by comparing the body to the box,
          // because they are locked to having the same width attributes.
          // https://bugs.chromium.org/p/chromium/issues/detail?id=976224
          const zoomScale = node(this.box).getBoundingClientRect().width /
            node(this.body).getBoundingClientRect().width;

          var width = Math.max(textRect.width * zoomScale, MIN_MESSAGE_WIDTH),
            height = textRect.height * zoomScale;
          setAttr(this.box, { width, height });
          setAttr(this.body, { width, height });
          this.setMsg(new MessageItem(this.msg.resource, [width, height]));

          if (data != null) // i.e. data has changed
            await this.syncLinks();

          // Update the position of all link lines
          this.allOutLinks.forEach(link =>
            this.withThat(link.toId, that => link.update(this.rect, that.rect)));
          this.allInLinks.forEach(link =>
            this.withThat(link.fromId, that => link.update(that.rect, this.rect)));
          resolve();
        } catch (err) {
          reject(err);
        }
      });
    });
  }

  private syncLinks() {
    const outLinks = this.msg.linkTo.map(ref => ref['@id']);
    // Remove non-existent outbound link-lines
    LinkView.remove(this.allOutLinks.filter(link => !outLinks.includes(link.toId)));
    // Create outbound link-lines if missing
    outLinks.forEach(thatId => this.withThat(thatId, that => this.link(that)));

    return this.boardView.linksTo(this.msg['@id']).then(inLinks => {
      // Remove non-existent inbound link-lines
      LinkView.remove(this.allInLinks.filter(link => !inLinks.includes(link.fromId)));
      // Create inound link-lines if missing
      inLinks.forEach(thatId => this.withThat(thatId, that => that.link(this)));
    });
  }

  toggleCode() {
    this.updateText(!this.codeMode);
    this.content.attr('contenteditable', !this.codeMode);
    this.box.classed('code-mode', this.codeMode);
    this.d3.raise();
    this.update();
  }

  set active(active: boolean) {
    this.d3.classed('active', active);
  }

  get text(): string {
    return node(this.content).innerHTML;
  }

  private updateText(codeMode: boolean = this.codeMode) {
    // This has the effect of switching to the given codeMode, see codeMode()
    node(this.content).innerHTML = codeMode ? `<pre>${this.msgCode}</pre>` : this.msg.text;
  }

  private get msgCode(): string {
    return JSON.stringify(this.msg, null, 2);
  }

  private get codeMode(): boolean {
    return !this.content.select('pre').empty();
  }

  private get allOutLinks() {
    return LinkView.fromLinkLines(this.boardView.svg, this.msg['@id']);
  }

  private get allInLinks() {
    return LinkView.toLinkLines(this.boardView.svg, this.msg['@id']);
  }

  private link(that: MessageView) {
    return LinkView.init(this.boardView.svg, this.msg['@id'], that.msg['@id']);
  }

  private withThat(thatId: string, action: (mv: MessageView) => any) {
    this.boardView.withThatMessage(thatId, action);
  }

  get rect(): Rectangle {
    return new Rectangle(this.position, this.size);
  }

  get size(): [number, number] {
    return [Number(this.box.attr('width')), Number(this.box.attr('height'))];
  }

  static messageParent(node: Element | null): SVGGElement {
    if (node == null)
      throw new Error('Message parent expected');
    return d3.select(node).classed('board-message') ?
      <SVGGElement>node : this.messageParent(node.parentElement);
  }

  static same(mv1?: MessageView, mv2?: MessageView) {
    return (!mv1 && !mv2) || (mv1 && mv2 && mv1.msg['@id'] == mv2.msg['@id']);
  }

  private static createMessageViewNode(): Element {
    // Note that the template is found in /src/demo.html
    return <Element>(<Element>d3.select('#board-message-template').node()).cloneNode(true);
  }
}