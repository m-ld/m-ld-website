import * as d3 from 'd3';
import { setAttr } from './util';
import { Message } from './Message';
import { BoardView } from './BoardView';

const MAGIC_DIV_SCALE: number = 10 / 9;

export class MessageView {
  private readonly group: d3.Selection<SVGGElement, Message, HTMLElement, unknown>;
  private readonly shape: d3.Selection<SVGRectElement, Message, HTMLElement, unknown>;
  private readonly content: d3.Selection<SVGForeignObjectElement, Message, HTMLElement, unknown>;

  constructor(node: Element) {
    this.group = d3.select(MessageView.messageParent(node));
    this.shape = this.group.select('.shape');
    this.content = this.group.select('.content');
  }

  public static sync(data: Message[], view: BoardView) {
    const enter = view.page.selectAll('.message').data(data, function (this: Element, msg: Message) {
      return msg ? msg['@id'] : this.id;
    });
    enter.select(() => view.append(<Element>MessageView.template.cloneNode(true)))
      .attr('id', msg => msg['@id'])
      .classed('message', true);
    enter.select('.shape').attr('x', msg => msg.x).attr('y', msg => msg.y);
    enter.select('.content > div').text(msg => msg.text).on('input', function (this: Element, msg) {
      msg.text = this.textContent;
      new MessageView(this).sizeToContent(view);
    });
    enter.each(function (this: Element) {
      new MessageView(this).sizeToContent(view);
    });
  }

  private sizeToContent(view: BoardView) {
    // Ensure the content is in the same position as the shape
    setAttr(this.content, { x: this.shape.attr('x'), y: this.shape.attr('y') });
    // Size the shape to the content
    var { left, top, right, bottom } = this.content.node().getBoundingClientRect();
    var [left, top] = view.clientToSvg(left, top), [right, bottom] = view.clientToSvg(right, bottom);
    var width = (right - left) * MAGIC_DIV_SCALE, height = (bottom - top) * MAGIC_DIV_SCALE;
    setAttr(this.shape, { width, height });
    setAttr(this.content, { width, height });
  }

  private static get template(): Element {
    // Note that the template is found in /src/demo.html
    return <Element>d3.select('#message-template').node();
  }

  private static messageParent(node: Element): SVGGElement {
    if (node)
      return d3.select(node).classed('message') ?
        <SVGGElement>node : MessageView.messageParent(node.parentElement);
  }
}