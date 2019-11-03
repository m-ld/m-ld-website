import * as d3 from 'd3';
import { setAttr } from './util';
import { Message } from './Message';
import { BoardView } from './BoardView';
import { Line, Rectangle } from './Shapes';
import { Board } from './Board';

const MAGIC_DIV_SCALE: number = 10 / 9;
const MIN_MESSAGE_WIDTH: number = 115; // Width of buttons + 20

export class MessageView {
  private readonly boardView: BoardView;
  private readonly group: d3.Selection<SVGGElement, Message, HTMLElement, unknown>;

  constructor(node: Element, boardView: BoardView) {
    this.group = d3.select(MessageView.messageParent(node));
    this.boardView = boardView;
  }

  public static sync(bv: BoardView) {
    const enter = MessageView.messages(bv).enter()
      .select(() => bv.append(<Element>MessageView.template().cloneNode(true)))
      .classed('message', true)
      .attr('id', msg => msg['@id'])
      .each(MessageView.call(mv => mv.position = [mv.msg.x, mv.msg.y], bv));
    enter.select('.board-message-body > div')
      .text(msg => msg.text)
      .on('input', MessageView.call(mv => mv.update(), bv));
    enter.each(MessageView.call(mv => mv.update(), bv));

    // TODO: Push removal to m-ld instead
    // TODO: Remove link lines
    enter.select('.board-message-close').on('click', MessageView.call(mv => mv.group.remove(), bv));

    enter.selectAll('.board-message-move').call(d3.drag()
      .container(bv.svg.node())
      .on('drag', MessageView.call(mv => {
        // Do not modify the message data here, just the visual location
        const [x, y] = mv.position;
        mv.group.raise();
        mv.position = [x + d3.event.dx, y + d3.event.dy];
        mv.update();
      }, bv))
      .on('end', MessageView.call(mv => {
        // TODO: Commit the change to the message
      }, bv)));
  }

  private static call(action: (mv: MessageView) => void, view: BoardView): (this: Element) => void {
    return function (this: Element) {
      action.call(null, new MessageView(this, view));
    }
  }

  private get msg(): Message {
    return this.group.datum();
  }

  private get box(): d3.Selection<SVGRectElement, Message, HTMLElement, unknown> {
    return this.group.select('.board-message-box');
  }

  private get body(): d3.Selection<SVGForeignObjectElement, Message, HTMLElement, unknown> {
    return this.group.select('.board-message-body');
  }

  private get text(): d3.Selection<HTMLDivElement, Message, HTMLElement, unknown> {
    return this.body.select('div');
  }

  private update() {
    // Size the shape to the content
    var { left, top, right, bottom } = this.text.node().getBoundingClientRect();
    var [left, top] = this.boardView.clientToSvg(left, top),
      [right, bottom] = this.boardView.clientToSvg(right, bottom);
    var width = Math.max((right - left) * MAGIC_DIV_SCALE, MIN_MESSAGE_WIDTH),
      height = (bottom - top) * MAGIC_DIV_SCALE;
    setAttr(this.box, { width, height });
    setAttr(this.body, { width, height });
    // Re-draw outbound links
    this.msg.linkTo.forEach(thatId => this.callOther(thatId, that => this.updateLink(that)));
    // Re-draw inbound links
    this.boardView.board.linksTo(this.msg["@id"])
      .forEach(thatId => this.callOther(thatId, that => that.updateLink(this)));
  }

  private callOther(thatId: string, action: (mv: MessageView) => void) {
    this.boardView.svg.select(`#${thatId}`).each(MessageView.call(action, this.boardView));
  }

  private updateLink(that: MessageView) {
    if (that && this.rect.area && that.rect.area) {
      const link = this.findOrCreateLink(that.msg["@id"]);
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
    const linkId = `${this.msg["@id"]}-${thatId}`;
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

  private get rect(): Rectangle {
    return new Rectangle(this.position, this.size);
  }

  private get size(): number[] {
    return [Number(this.box.attr('width')), Number(this.box.attr('height'))];
  }

  private get position(): number[] {
    const t = this.group.attr('transform').match(/translate\(([-0-9\.]+),\s+([-0-9\.]+)\)/);
    return [Number(t[1]), Number(t[2])];
  }

  private set position([x, y]: number[]) {
    this.group.attr('transform', `translate(${x}, ${y})`);
  }

  private static messages(view: BoardView) {
    return view.svg.selectAll('.message')
      .data(view.board.messages, function (this: Element, msg: Message) {
        return msg ? msg['@id'] : this.id;
      });
  }

  private static template(): Element {
    // Note that the template is found in /src/demo.html
    return <Element>d3.select('#board-message-template').node();
  }

  private static messageParent(node: Element): SVGGElement {
    if (node)
      return d3.select(node).classed('message') ?
        <SVGGElement>node : MessageView.messageParent(node.parentElement);
  }
}