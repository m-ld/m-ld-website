import * as d3 from 'd3';
import { Message } from './Message';
import { setAttr, shortId, getAttr, svgPoint, svgParent } from './util';
import { Board } from './Board';
import { InfiniteView } from './InfiniteView';
import { MessageView } from './MessageView';
import { GroupUI } from './GroupUI';
import { Rectangle } from './Shapes';

export class BoardView extends InfiniteView {
  readonly board: Board;

  constructor(selectSvg: string, board: Board) {
    super(selectSvg);
    this.board = board;

    // Sync all the messages in the given board now
    this.sync(board.messages);

    this.board.events.on('add', msg => this.sync([msg]));

    this.board.events.on('remove', msg => {
      this.withThatMessage(msg['@id'], mv => mv.group.remove());
      // Remove all link-lines to and from the removed messsage
      this.svg.selectAll(`.link-line[id$="-${msg['@id']}"], .link-line[id^="${msg['@id']}-"]`).remove();
    });
  }

  private sync(messages: Message[]) {
    const bv = this;
    const selection = this.svg.selectAll('.board-message')
      .data(messages, function (this: Element, msg: Message) {
        return msg ? msg['@id'] : this.id;
      });

    const enter = selection.enter()
      .select(() => this.append(<Element>MessageView.template.cloneNode(true)))
      .classed('board-message', true)
      .attr('id', msg => msg['@id'])
      .each(this.withThisMessage(mv => mv.position = [mv.msg.x, mv.msg.y]));
    enter.select('.board-message-body > div')
      .text(msg => msg.text)
      .on('input', this.withThisMessage(mv => mv.update()));
    enter.select('.board-message-close circle').on('click',
      this.withThisMessage(mv => this.board.remove(mv.msg['@id'])));
    enter.selectAll('.board-message-add circle').on('click', this.withThisMessage(mv => {
      const id = shortId();
      mv.msg.linkTo.push(id);
      // TODO: Prevent collisions
      this.board.add({ '@id': id, text: '', x: mv.msg.x + 50, y: mv.msg.y + 100, linkTo: [] });
      this.withThatMessage(id, mv => mv.text.node().focus());
    })).call(d3.drag() // Set up drag-to-link behaviour
      .container(this.svg.node())
      .clickDistance(3) // Ensure that single-click hits click handler
      .subject(function (this: SVGElement) {
        const button = new GroupUI(<SVGGElement>svgParent(this)), startPos = button.position;
        return { x: d3.event.x, y: d3.event.y, target: null, button, startPos, mv: new MessageView(this, bv) };
      })
      .on('start', function (this: Element) {
        const drag = d3.event.subject;
        d3.select(this).attr('cursor', 'none');
        drag.mv.group.classed('linking', true);
      })
      .on('drag', this.withThisMessage(mv => {
        mv.group.raise(); // So that the button drags over other messages
        const drag = d3.event.subject, [cx, cy] = drag.button.position;
        drag.button.position = [cx + d3.event.dx, cy + d3.event.dy];
        // Hit-test for other messages
        const target = this.hitTest(this.svgRect(drag.button.group.node()),
          that => !MessageView.same(mv, that) && !mv.msg.linkTo.includes(that.msg['@id']));
        if (!MessageView.same(drag.target, target)) {
          target && target.box.classed('link-target', true);
          drag.target && drag.target.box.classed('link-target', false);
        }
        drag.target = target;
      }))
      .on('end', function (this: Element) {
        const drag = d3.event.subject;
        d3.select(this).attr('cursor', 'alias');
        if (drag.target) {
          const mv = new MessageView(this, bv);
          drag.target.box.classed('link-target', false);
          mv.msg.linkTo.push(drag.target.msg['@id']);
          mv.update();
        }
        drag.button.position = drag.startPos;
        drag.mv.group.classed('linking', false);
      }));
    enter.selectAll('.board-message-move circle').call(d3.drag()
      .container(this.svg.node())
      .on('start', function (this: Element) {
        d3.select(this).attr('cursor', 'none');
      })
      .on('drag', this.withThisMessage(mv => {
        // Do not modify the message data here, just the visual location
        const [x, y] = mv.position;
        mv.group.raise();
        mv.position = [x + d3.event.dx, y + d3.event.dy];
        mv.update();
      }))
      .on('end', function (this: Element) {
        d3.select(this).attr('cursor', 'grab');
        const mv = new MessageView(this, bv);
        // Commit the change to the message
        const [x, y] = mv.position;
        mv.msg.x = x;
        mv.msg.y = y;
        // TODO: Notify update
      }));

    // Call update for everyone, including the new folks
    selection.merge(enter).each(this.withThisMessage(mv => mv.update()));
  }

  svgRect(el: Element): Rectangle {
    var { left, top, right, bottom } = el.getBoundingClientRect();
    var [left, top] = this.clientToSvg([left, top]),
      [right, bottom] = this.clientToSvg([right, bottom]);
    return new Rectangle([left, top], [right - left, bottom - top]);
  }

  hitTest(test: Rectangle, filter: (mv: MessageView) => boolean): MessageView {
    // May need to be optimised with e.g. rbush
    const foundNode = this.svg.selectAll('.board-message').filter(this.withThisMessage(mv => {
      return mv.rect.intersects(test) && filter(mv);
    })).node();
    return foundNode && new MessageView(<Element>foundNode, this);
  }

  withThisMessage(action: (mv: MessageView) => any): (this: Element) => any {
    const bv = this;
    return function (this: Element) {
      return action.call(null, new MessageView(this, bv));
    }
  }

  withThatMessage(thatId: string, action: (mv: MessageView) => any) {
    this.svg.select(`#${thatId}`).each(this.withThisMessage(action));
  }

  append(el: Element): Element {
    return this.svg.node().insertAdjacentElement('beforeend', el);
  }
}
