import * as d3 from 'd3';
import { Message } from './Message';
import { setAttr, shortId } from './util';
import { Board } from './Board';
import { InfiniteView } from './InfiniteView';
import { MessageView } from './MessageView';

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
      // Remove all links to and from the removed messsage
      this.svg.selectAll(`.link[id$="-${msg['@id']}"], line[id^="${msg['@id']}-"]`).remove();
    });
  }

  private sync(messages: Message[]) {
    const selection = this.svg.selectAll('.message')
      .data(messages, function (this: Element, msg: Message) {
        return msg ? msg['@id'] : this.id;
      });

    const enter = selection.enter()
      .select(() => this.append(<Element>MessageView.template.cloneNode(true)))
      .classed('message', true)
      .attr('id', msg => msg['@id'])
      .each(this.withThisMessage(mv => mv.position = [mv.msg.x, mv.msg.y]));
    enter.select('.board-message-body > div')
      .text(msg => msg.text)
      .on('input', this.withThisMessage(mv => mv.update()));
    enter.select('.board-message-close').on('click',
      this.withThisMessage(mv => this.board.remove(mv.msg['@id'])));
    enter.select('.board-message-add').on('click', this.withThisMessage(mv => {
      const id = shortId();
      mv.msg.linkTo.push(id);
      // TODO: Prevent collisions
      this.board.add({ '@id': id, text: '', x: mv.msg.x + 50, y: mv.msg.y + 100, linkTo: [] });
      this.withThatMessage(id, mv => mv.text.node().focus());
    }));
    enter.selectAll('.board-message-move').call(d3.drag()
      .container(this.svg.node())
      .on('drag', this.withThisMessage(mv => {
        // Do not modify the message data here, just the visual location
        const [x, y] = mv.position;
        mv.group.raise();
        mv.position = [x + d3.event.dx, y + d3.event.dy];
        mv.update();
      }))
      .on('end', this.withThisMessage(mv => {
        // Commit the change to the message
        const [x, y] = mv.position;
        mv.msg.x = x;
        mv.msg.y = y;
        // TODO: Notify update
      })));

    // Call update for everyone, including the new folks
    selection.merge(enter).each(this.withThisMessage(mv => mv.update()));
  }

  withThisMessage(action: (mv: MessageView) => void): (this: Element) => void {
    const bv = this;
    return function (this: Element) {
      action.call(null, new MessageView(this, bv));
    }
  }

  withThatMessage(thatId: string, action: (mv: MessageView) => void) {
    this.svg.select(`#${thatId}`).each(this.withThisMessage(action));
  }

  append(el: Element): Element {
    return this.svg.node().insertAdjacentElement('beforeend', el);
  }
}
