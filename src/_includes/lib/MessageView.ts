import * as d3 from 'd3';
import { setAttr, idNotInFilter } from './util';
import { Message } from './Message';
import { BoardView } from './BoardView';
import { Line, Rectangle } from './Shapes';
import { GroupUI } from './GroupUI';

const MAGIC_DIV_SCALE: number = 10 / 9;
const MIN_MESSAGE_WIDTH: number = 115; // Width of buttons + 20

export class MessageView extends GroupUI<Message> {
  readonly boardView: BoardView;

  constructor(node: Element, boardView: BoardView) {
    super(MessageView.messageParent(node));
    this.boardView = boardView;
  }

  get msg(): Message {
    return this.group.datum();
  }

  get box(): d3.Selection<SVGRectElement, Message, HTMLElement, unknown> {
    return this.group.select('.board-message-box');
  }

  get body(): d3.Selection<SVGForeignObjectElement, Message, HTMLElement, unknown> {
    return this.group.select('.board-message-body');
  }

  get text(): d3.Selection<HTMLDivElement, Message, HTMLElement, unknown> {
    return this.body.select('div');
  }

  update() {
    // Size the shape to the content
    const textRect = this.boardView.svgRect(this.text.node());
    var width = Math.max(textRect.width * MAGIC_DIV_SCALE, MIN_MESSAGE_WIDTH),
      height = textRect.height * MAGIC_DIV_SCALE;
    setAttr(this.box, { width, height });
    setAttr(this.body, { width, height });

    const outLinks = this.msg.linkTo;
    // Re-draw outbound link-lines
    outLinks.forEach(thatId => this.withThat(thatId, that => this.updateLink(that)));
    // Remove non-existent outbound link-lines
    this.allOutLinkLines()
      .filter(idNotInFilter(outLinks.map(thatId => MessageView.linkId(this.msg['@id'], thatId))))
      .remove();

    const inLinks = this.boardView.board.linksTo(this.msg['@id']);
    // Re-draw inbound link-lines
    inLinks.forEach(thatId => this.withThat(thatId, that => that.updateLink(this)));
    // Remove non-existent inbound link-lines
    this.allInLinkLines()
      .filter(idNotInFilter(inLinks.map(thatId => MessageView.linkId(thatId, this.msg['@id']))))
      .remove();
  }

  remove() {
    this.group.remove();
    // Remove all link-lines from and to the removed messsage
    this.allOutLinkLines().remove();
    this.allInLinkLines().remove();
  }

  private allOutLinkLines() {
    return this.boardView.svg.selectAll(`.link-line[id^="${this.msg['@id']}-"]`);
  }

  private allInLinkLines() {
    return this.boardView.svg.selectAll(`.link-line[id$="-${this.msg['@id']}"]`);
  }

  static linkId(fromId: string, toId: string) {
    return `${fromId}-${toId}`;
  }

  private updateLink(that: MessageView) {
    if (that && this.rect.area && that.rect.area) {
      const link = this.findOrCreateLink(that.msg['@id']);
      const centreLine = new Line(this.rect.centre, that.rect.centre);
      const begin = this.rect.intersect(centreLine),
        end = that.rect.expand(5).intersect(centreLine);
      if (begin.length && end.length) {
        setAttr(link, new Line(begin[0], end[0]));
      } else { // Messages overlap
        link.remove();
      }
    }
  }

  private findOrCreateLink(thatId: string) {
    const linkId = MessageView.linkId(this.msg['@id'], thatId);
    const link = this.boardView.svg.select(`#${linkId}`);
    if (link.empty()) {
      return this.boardView.svg.selectAll('#link-lines')
        .append(MessageView.createLinkLineNode)
        .classed('link-line', true)
        .attr('id', linkId);
    } else {
      return link;
    }
  }

  private withThat(thatId: string, action: (mv: MessageView) => any) {
    this.boardView.withThatMessage(thatId, action);
  }

  get rect(): Rectangle {
    return new Rectangle(this.position, this.size);
  }

  get size(): number[] {
    return [Number(this.box.attr('width')), Number(this.box.attr('height'))];
  }

  static createMessageViewNode(): Element {
    // Note that the template is found in /src/demo.html
    return <Element>(<Element>d3.select('#board-message-template').node()).cloneNode(true);
  }

  static createLinkLineNode(): Element {
    return <Element>(<Element>d3.select('#link-line-template').node()).cloneNode(true);
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