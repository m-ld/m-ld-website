import * as d3 from 'd3';
import { setAttr, idNotInFilter } from './util';
import { BoardView } from './BoardView';
import { Rectangle } from './Shapes';
import { GroupUI } from './GroupUI';
import { Message } from './Message';
import { LinkView } from './LinkView';
import { Resource } from '@m-ld/m-ld';
import { showWarning } from './BoardControls';

const MAGIC_DIV_SCALE: number = 10 / 9;
const MIN_MESSAGE_WIDTH: number = 115; // Width of buttons + 20

export class MessageView extends GroupUI<Resource<Message>> {
  readonly boardView: BoardView;

  constructor(node: Element, boardView: BoardView) {
    super(MessageView.messageParent(node));
    this.boardView = boardView;
  }

  get msg(): Resource<Message> {
    return this.group.datum();
  }

  get box(): d3.Selection<SVGRectElement, Resource<Message>, HTMLElement, unknown> {
    return this.group.select('.board-message-box');
  }

  get body(): d3.Selection<SVGForeignObjectElement, Resource<Message>, HTMLElement, unknown> {
    return this.group.select('.board-message-body');
  }

  get content(): d3.Selection<HTMLDivElement, Resource<Message>, HTMLElement, unknown> {
    return this.body.select('div');
  }

  static mergeText(value: string | string[]): string {
    return Array.isArray(value) ? value.join('<br>') : value;
  }

  get msgText(): string {
    return MessageView.mergeText(this.msg.text);
  }

  static mergePosition([xs, ys]: [number | number[], number | number[]]): [number, number] {
    return [
      Array.isArray(xs) ? Math.min(...xs) : xs,
      Array.isArray(ys) ? Math.min(...ys) : ys
    ];
  }

  get msgPosition(): [number, number] {
    return MessageView.mergePosition([this.msg.x, this.msg.y]);
  }

  update(fromData?: 'fromData') {
    if (fromData) {
      // Update the visible text - but not if the user is editing
      if (document.activeElement !== this.content.node())
        this.updateText();
      // Update the position
      this.position = this.msgPosition;
    }

    // We push the re-sizing to the next frame because Firefox sometimes hasn't
    // updated the bounding client rect yet.
    window.requestAnimationFrame(() => {
      // Size the shape to the content
      const textRect = this.boardView.svgRect(this.content.node());
      var width = Math.max(textRect.width * MAGIC_DIV_SCALE, MIN_MESSAGE_WIDTH),
        height = textRect.height * MAGIC_DIV_SCALE;
      setAttr(this.box, { width, height });
      setAttr(this.body, { width, height });

      // Re-draw outbound link-lines
      const outLinks = this.msg.linkTo;
      outLinks.forEach(that => this.withThat(that['@id'], that => this.updateLink(that)));
      // Remove non-existent outbound link-lines
      this.allOutLinkLines()
        .filter(idNotInFilter(outLinks.map(that => LinkView.linkId(this.msg['@id'], that['@id']))))
        .remove();

      // Re-draw inbound link-lines
      this.boardView.linksTo(this.msg['@id']).then(inLinks => {
        inLinks.forEach(thatId => this.withThat(thatId, that => that.updateLink(this)));
        // Remove non-existent inbound link-lines
        this.allInLinkLines()
          .filter(idNotInFilter(inLinks.map(thatId => LinkView.linkId(thatId, this.msg['@id']))))
          .remove();
      }, showWarning);
    });
  }

  remove() {
    this.group.remove();
    // Remove all link-lines from and to the removed messsage
    this.allOutLinkLines().remove();
    this.allInLinkLines().remove();
  }

  toggleCode() {
    this.updateText(!this.codeMode);
    this.content.attr('contenteditable', !this.codeMode);
    this.box.classed('code-mode', this.codeMode);
    this.group.raise();
    this.update();
  }

  get text(): string {
    return this.content.node().innerHTML;
  }

  private updateText(codeMode: boolean = this.codeMode) {
    // This has the effect of switching to the given codeMode, see codeMode()
    this.content.node().innerHTML = codeMode ? `<pre>${this.msgCode}</pre>` : this.msgText;
  }

  private get msgCode(): string {
    return JSON.stringify(this.msg, null, 2);
  }

  private get codeMode(): boolean {
    return !this.content.select('pre').empty();
  }

  private allOutLinkLines() {
    return this.boardView.svg.selectAll(`.link-line[id^="${this.msg['@id']}-"]`);
  }

  private allInLinkLines() {
    return this.boardView.svg.selectAll(`.link-line[id$="-${this.msg['@id']}"]`);
  }

  private updateLink(that: MessageView) {
    new LinkView(this.boardView.svg, this.msg['@id'], that.msg['@id']).update(this.rect, that.rect);
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

  static createMessageViewNode(): Element {
    // Note that the template is found in /src/demo.html
    return <Element>(<Element>d3.select('#board-message-template').node()).cloneNode(true);
  }

  static messageParent(node: Element): SVGGElement {
    if (node)
      return d3.select(node).classed('board-message') ?
        <SVGGElement>node : this.messageParent(node.parentElement);
  }

  static same(mv1: MessageView, mv2: MessageView) {
    return (!mv1 && !mv2) || (mv1 && mv2 && mv1.msg['@id'] == mv2.msg['@id']);
  }
}