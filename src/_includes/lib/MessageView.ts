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
      .each(MessageView.call(mv => mv.setPosition(mv.msg().x, mv.msg().y), view));
    enter.select('.message-content > div')
      .text(msg => msg.text)
      .on('input', MessageView.call(mv => mv.update(), view));
    enter.each(MessageView.call(mv => mv.update(), view));

    // TODO: Push removal to m-ld instead
    // TODO: Remove link lines
    enter.select('.message-close').on('click', MessageView.call(mv => mv.group.remove(), view));

    enter.selectAll('.message-move').call(d3.drag()
      .container(view.page.node())
      .on('drag', MessageView.call(mv => {
        // Do not modify the message data here, just the visual location
        const [x, y] = mv.getPosition();
        mv.setPosition(x + d3.event.dx, y + d3.event.dy);
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

  private msg(): Message {
    return this.group.datum();
  }

  private box(): d3.Selection<SVGRectElement, Message, HTMLElement, unknown> {
    return this.group.select('.message-box');
  }

  private content(): d3.Selection<SVGForeignObjectElement, Message, HTMLElement, unknown> {
    return this.group.select('.message-content');
  }

  private text(): d3.Selection<HTMLDivElement, Message, HTMLElement, unknown> {
    return this.content().select('div');
  }

  private update() {
    // Size the shape to the content
    var { left, top, right, bottom } = this.text().node().getBoundingClientRect();
    var [left, top] = this.boardView.clientToSvg(left, top),
      [right, bottom] = this.boardView.clientToSvg(right, bottom);
    var width = Math.max((right - left) * MAGIC_DIV_SCALE, MIN_MESSAGE_WIDTH),
      height = (bottom - top) * MAGIC_DIV_SCALE;
    setAttr(this.box(), { width, height });
    setAttr(this.content(), { width, height });
    // Re-draw outbound links
    this.msg().linkTo.forEach(thatId => this.updateLink(thatId));
    // TODO Re-draw inbound links
  }

  private updateLink(thatId: String) {
    const linkId = `${this.msg()["@id"]}-${thatId}`;
    const thatNode = <Element>this.boardView.page.select(`#${thatId}`).node();
    if (thatNode) {
      const that = new MessageView(thatNode, this.boardView);
      const thisRect = this.getRect(), thatRect = that.getRect();
      if (thisRect.area() && thatRect.area()) {
        let link = this.boardView.page.select(`#${linkId}`);
        if (link.empty())
          link = this.boardView.page.append('line').attr('id', linkId).classed('link', true);
        const centreLine = new Line(thisRect.centre(), thatRect.centre());
        const linkLine = new Line(thisRect.intersect(centreLine)[0], thatRect.intersect(centreLine)[0]);
        setAttr(link, linkLine);
      }
    }
  }

  private getRect(): Rectangle {
    return new Rectangle(this.getPosition(), this.getSize());
  }

  private getSize(): number[] {
    return [Number(this.box().attr('width')), Number(this.box().attr('height'))];
  }

  private getPosition(): Array<number> {
    const t = this.group.attr('transform').match(/translate\(([-0-9\.]+),\s+([-0-9\.]+)\)/);
    return [Number(t[1]), Number(t[2])];
  }

  private setPosition(x: number, y: number) {
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
    return <Element>d3.select('#message-template').node();
  }

  private static messageParent(node: Element): SVGGElement {
    if (node)
      return d3.select(node).classed('message') ?
        <SVGGElement>node : MessageView.messageParent(node.parentElement);
  }
}