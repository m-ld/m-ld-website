import * as d3 from 'd3';
import { setAttr } from './util';
import { Message } from './Message';
import { BoardView } from './BoardView';
import { Line, Rectangle } from './Shapes';

const MAGIC_DIV_SCALE: number = 10 / 9;
const MIN_MESSAGE_WIDTH: number = 115; // Width of buttons + 20

export class MessageView {
  private readonly boardView: BoardView;
  private readonly group: d3.Selection<SVGGElement, Message, HTMLElement, unknown>;

  constructor(node: Element, boardView: BoardView) {
    this.group = d3.select(MessageView.messageParent(node));
    this.boardView = boardView;
  }

  public static sync(data: Message[], view: BoardView) {
    const enter = MessageView.messages(view, data).enter()
      .select(() => view.append(<Element>MessageView.template().cloneNode(true)))
      .classed('message', true)
      .attr('id', msg => msg['@id'])
      .each(MessageView.call(mv => mv.position = [mv.msg.x, mv.msg.y], view));
    enter.select('.board-message-body > div')
      .text(msg => msg.text)
      .on('input', MessageView.call(mv => mv.update(), view));
    enter.each(MessageView.call(mv => mv.update(), view));

    // TODO: Push removal to m-ld instead
    // TODO: Remove link lines
    enter.select('.board-message-close').on('click', MessageView.call(mv => mv.group.remove(), view));

    enter.selectAll('.board-message-move').call(d3.drag()
      .container(view.page.node())
      .on('drag', MessageView.call(mv => {
        // Do not modify the message data here, just the visual location
        const [x, y] = mv.position;
        mv.group.raise();
        mv.position = [x + d3.event.dx, y + d3.event.dy];
        mv.update();
      }, view))
      .on('end', MessageView.call(mv => {
        // TODO: Commit the change to the x, y of the message
      }, view)));
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
    this.msg.linkTo.forEach(thatId => this.updateLink(thatId));
    // TODO Re-draw inbound links
  }

  private updateLink(thatId: string) {
    const thatNode = <Element>this.boardView.page.select(`#${thatId}`).node();
    if (thatNode) {
      const that = new MessageView(thatNode, this.boardView);
      if (this.rect.area && that.rect.area) {
        const link = this.findOrCreateLink(thatId);
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
  }

  private findOrCreateLink(thatId: string) {
    const linkId = `${this.msg["@id"]}-${thatId}`;
    const link = this.boardView.page.select(`#${linkId}`);
    if (link.empty()) {
      return this.boardView.page.select('#links')
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

  private static messages(view: BoardView, data: Message[]) {
    return view.page.selectAll('.message')
      .data(data, function (this: Element, msg: Message) {
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