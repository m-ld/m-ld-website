import * as d3 from 'd3';

const MAGIC_DIV_SCALE: number = 10 / 9;

class Message {
  '@id': string;
  text: string;
  x: number;
  y: number;
}

class View {
  page: d3.Selection<SVGSVGElement, Message, HTMLElement, unknown>;

  constructor(data: Message[]) {
    this.page = d3.select('#page');

    window.onresize = () => {
      // Coerce the viewbox to the aspect ratio of the screen but keep the zoom
      const [vBx, vBy, ,] = this.getViewBox(), width = window.innerWidth, height = window.innerHeight;
      const [right, bottom] = this.clientToSvg(width, height);
      this.setViewBox(vBx, vBy, right - vBx, bottom - vBy);
      View.setAttr(this.page, { width, height });
    };

    // Set the initial zoom to zero
    this.setViewBox(0, 0, window.innerWidth, window.innerHeight);
    View.setAttr(this.page, { width: window.innerWidth, height: window.innerHeight });

    this.page.on('wheel', () => {
      const [mx, my] = this.clientToSvg(d3.event.clientX, d3.event.clientY);
      // Scale the viewbox such that the mouse position is static
      const [vBx, vBy, vBw, vBh] = this.getViewBox();
      const px = (mx - vBx) / vBw, py = (my - vBy) / vBh, d = -d3.event.deltaY;
      const p = vBw / vBh, dx = (p * d) / (1 + p), dy = d / (1 + p);
      this.setViewBox(vBx - (px * dx), vBy - (py * dy), vBw + dx, vBh + dy);
      d3.event.preventDefault();
    });

    const messages = this.page.selectAll('.message').data(data, function (this: Element, d: Message) {
      return d ? d['@id'] : this.id;
    });
    const newMessages = messages.enter().select(() => {
      this.page.node().insertAdjacentHTML('beforeend', `<g class="message" id="@id">
  <rect class="shape" x="0" y="0" width="0" height="0" rx="10" style="fill: lightgrey" />
  <foreignObject class="content" x="0" y="0" width="0" height="0">
    <div xmlns="http://www.w3.org/1999/xhtml" contenteditable="true"
      style="display: inline-block; padding: 15px; white-space: nowrap">
    </div>
  </foreignObject>
</g>`);
      return <d3.BaseType>this.page.node().lastChild;
    }).attr('id', d => d['@id']);
    newMessages.select('.shape').attr('x', d => d.x).attr('y', d => d.y);
    let view: View = this;
    newMessages.select('.content > div').text(d => d.text).on('input', function (this: Element, d) {
      d.text = this.textContent;
      view.sizeToContent(this);
    });
    newMessages.each(function (this: Element) {
      view.sizeToContent(this);
    });

  }

  getViewBox(): Array<number> {
    return this.page.attr('viewBox').split(/[\s,]+/).map(Number);
  }

  clientToSvg(x: number, y: number): Array<number> {
    let pt = this.page.node().createSVGPoint();
    pt.x = x;
    pt.y = y;
    pt = pt.matrixTransform(this.page.node().getScreenCTM().inverse());
    return [pt.x, pt.y];
  }

  setViewBox(x: number, y: number, width: number, height: number) {
    if (width > 0 && height > 0)
      this.page.attr('viewBox', [x, y, width, height].join(' '));
  }

  sizeToContent(node: Element) {
    const messageGroup = d3.select(View.messageParent(node)),
      messageShape = messageGroup.select('.shape'),
      messageContent = messageGroup.select('.content');
    // Ensure the content is in the same position as the shape
    View.setAttr(messageContent, { x: messageShape.attr('x'), y: messageShape.attr('y') });
    const contentDiv = <Element>messageContent.select('div').node();
    // Size the shape to the content
    var { left, top, right, bottom } = contentDiv.getBoundingClientRect();
    var [left, top] = this.clientToSvg(left, top), [right, bottom] = this.clientToSvg(right, bottom);
    var width = (right - left) * MAGIC_DIV_SCALE, height = (bottom - top) * MAGIC_DIV_SCALE;
    View.setAttr(messageShape, { width, height });
    View.setAttr(messageContent, { width, height });
  }

  static messageParent(node: Element): Element {
    if (node)
      return d3.select(node).classed('message') ? node : View.messageParent(node.parentElement)
  }

  static setAttr(selection: d3.Selection<d3.BaseType, unknown, d3.BaseType, unknown>, attrs: object) {
    Object.entries(attrs).forEach(([key, value]) => selection.attr(key, value))
  }
}

window.onload = function () {
  new View([
    { '@id': '12345678', text: 'Hello!', x: 200, y: 100 },
    { '@id': '12445678', text: 'Well hello!', x: 300, y: 300 }
  ]);
}