import * as d3 from 'd3';
import { setAttr } from './util';
import { Message } from './Message';
import { BoardView } from './BoardView';

const MAGIC_DIV_SCALE: number = 10 / 9;
const MIN_MESSAGE_WIDTH: number = 115; // Width of buttons + 20

export class MessageView {
  private readonly group: d3.Selection<SVGGElement, Message, HTMLElement, unknown>;
  private readonly box: d3.Selection<SVGRectElement, Message, HTMLElement, unknown>;
  private readonly content: d3.Selection<SVGForeignObjectElement, Message, HTMLElement, unknown>;
  private readonly text: d3.Selection<HTMLDivElement, Message, HTMLElement, unknown>;

  constructor(node: Element) {
    this.group = d3.select(MessageView.messageParent(node));
    this.box = this.group.select('.message-box');
    this.content = this.group.select('.message-content');
    this.text = this.content.select('div');
  }

  public static sync(data: Message[], view: BoardView) {
    const enter = MessageView.messages(view, data).enter()
      .select(() => view.append(<Element>MessageView.template().cloneNode(true)))
      .classed('message', true)
      .attr('id', msg => msg['@id'])
      .attr('transform', msg => `translate(${msg.x}, ${msg.y})`);
    enter.select('.message-content > div')
      .text(msg => msg.text)
      .on('input', function (this: Element, msg) {
        msg.text = this.textContent;
        new MessageView(this).sizeToContent(view);
      });
    enter.each(function (this: Element) {
      new MessageView(this).sizeToContent(view);
    });
    enter.select('.message-close').on('click', function (this: Element) {
      // TODO: Push removal to m-ld instead
      d3.select(MessageView.messageParent(this)).remove();
    });
  }

  private static messages(view: BoardView, data: Message[]) {
    return view.page.selectAll('.message')
      .data(data, function (this: Element, msg: Message) {
        return msg ? msg['@id'] : this.id;
      });
  }

  private sizeToContent(view: BoardView) {
    // Size the shape to the content
    var { left, top, right, bottom } = this.text.node().getBoundingClientRect();
    var [left, top] = view.clientToSvg(left, top), [right, bottom] = view.clientToSvg(right, bottom);
    var width = Math.max((right - left) * MAGIC_DIV_SCALE, MIN_MESSAGE_WIDTH),
      height = (bottom - top) * MAGIC_DIV_SCALE;
    setAttr(this.box, { width, height });
    setAttr(this.content, { width, height });
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