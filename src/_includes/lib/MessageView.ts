import * as d3 from 'd3';
import { setAttr } from './util';
import { Message } from './Message';
import { BoardView } from './BoardView';
import { Line, Rectangle } from './Shapes';

const MAGIC_DIV_SCALE: number = 10 / 9;
const MIN_MESSAGE_WIDTH: number = 115; // Width of buttons + 20

export class MessageView {
  readonly boardView: BoardView;
  readonly group: d3.Selection<SVGGElement, Message, HTMLElement, unknown>;

  constructor(node: Element, boardView: BoardView) {
    this.group = d3.select(MessageView.messageParent(node));
    this.boardView = boardView;
  }

  private withThat(thatId: string, action: (mv: MessageView) => void) {
    this.boardView.withThatMessage(thatId, action);
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
    var { left, top, right, bottom } = this.text.node().getBoundingClientRect();
    var [left, top] = this.boardView.clientToSvg(left, top),
      [right, bottom] = this.boardView.clientToSvg(right, bottom);
    var width = Math.max((right - left) * MAGIC_DIV_SCALE, MIN_MESSAGE_WIDTH),
      height = (bottom - top) * MAGIC_DIV_SCALE;
    setAttr(this.box, { width, height });
    setAttr(this.body, { width, height });
    // Re-draw outbound links
    this.msg.linkTo.forEach(thatId => this.withThat(thatId, that => this.updateLink(that)));
    // Re-draw inbound links
    this.boardView.board.linksTo(this.msg['@id'])
      .forEach(thatId => this.withThat(thatId, that => that.updateLink(this)));
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
    const linkId = `${this.msg['@id']}-${thatId}`;
    const link = this.boardView.svg.select(`#${linkId}`);
    if (link.empty()) {
      return this.boardView.svg.select('#links')
        .append('line')
        .attr('id', linkId)
        .classed('link', true)
        .attr('marker-end', 'url(#link-arrowhead)');
    } else {
      return link;
    }
  }

  get rect(): Rectangle {
    return new Rectangle(this.position, this.size);
  }

  get size(): number[] {
    return [Number(this.box.attr('width')), Number(this.box.attr('height'))];
  }

  get position(): number[] {
    const t = this.group.attr('transform').match(/translate\(([-0-9\.]+),\s+([-0-9\.]+)\)/);
    return [Number(t[1]), Number(t[2])];
  }

  set position([x, y]: number[]) {
    this.group.attr('transform', `translate(${x}, ${y})`);
  }

  static get template(): Element {
    // Note that the template is found in /src/demo.html
    return <Element>d3.select('#board-message-template').node();
  }

  static messageParent(node: Element): SVGGElement {
    if (node)
      return d3.select(node).classed('message') ?
        <SVGGElement>node : this.messageParent(node.parentElement);
  }
}