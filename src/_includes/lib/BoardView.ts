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
    this.board.events.on('remove', msg => this.withThatMessage(msg['@id'], mv => mv.remove()));
  }

  private sync(messages: Message[]) {
    const selection = this.svg.selectAll('.board-message')
      .data(messages, function (this: Element, msg: Message) {
        return msg ? msg['@id'] : this.id;
      });

    const enter = selection.enter()
      .select(() => this.append(MessageView.createMessageViewNode()))
      .classed('board-message', true)
      .attr('id', msg => msg['@id'])
      .each(this.withThisMessage(mv => mv.position = [mv.msg.x, mv.msg.y]));
    enter.select('.board-message-body > div')
      .text(msg => msg.text)
      .on('focus', this.withThisMessage(mv => mv.group.raise()))
      .on('input', this.withThisMessage(mv => mv.update()));
    enter.select('.board-message-close circle')
      .on('click', this.withThisMessage(mv => this.board.remove(mv.msg['@id'])))
      .call(this.setupBtnDrag(this.unlinkDragging, this.unlinkDragEnd));
    enter.select('.board-message-add circle')
      .on('click', this.withThisMessage(this.addNewMessage))
      .call(this.setupBtnDrag(this.linkDragging, this.linkDragEnd));
    enter.selectAll('.board-message-move circle').call(d3.drag()
      .container(this.svg.node())
      .on('start', this.withThisMessage(this.moveDragStart))
      .on('drag', this.withThisMessage(this.moveDragging))
      .on('end', this.withThisMessage(this.moveDragEnd)));
    enter.select('.board-message-code circle')
      .on('click', this.withThisMessage(mv => mv.toggleCode()));

    // Call update for everyone, including the new folks
    selection.merge(enter).each(this.withThisMessage(mv => mv.update()));
  }

  private setupBtnDrag(dragging: (mv: MessageView) => void,
    dragEnd: (mv: MessageView, dragged: SVGElement) => void):
    (selection: d3.Selection<d3.BaseType, unknown, Element, Message>) => void {
    return d3.drag() // Set up drag-to-link behaviour
      .container(this.svg.node())
      .clickDistance(3) // Ensure that single-click hits click handler
      .subject(this.withThisMessage(this.btnDragSubject))
      .on('start', this.withThisMessage(this.btnDragStart))
      .on('drag', this.withThisMessage(dragging))
      .on('end', this.withThisMessage(dragEnd));
  }

  private moveDragStart(_: MessageView, dragged: SVGElement) {
    d3.select(dragged).attr('cursor', 'none');
  }

  private moveDragging(mv: MessageView) {
    // Do not modify the message data here, just the visual location
    const [x, y] = mv.position;
    mv.group.raise();
    mv.position = [x + d3.event.dx, y + d3.event.dy];
    mv.update();
  }

  private moveDragEnd(mv: MessageView, dragged: SVGElement) {
    d3.select(dragged).attr('cursor', 'grab');
    // Commit the change to the message
    const [x, y] = mv.position;
    mv.msg.x = x;
    mv.msg.y = y;
    mv.update();
  }

  private btnDragSubject(_: MessageView, dragged: SVGElement) {
    const button = new GroupUI(<SVGGElement>svgParent(dragged)), startPos = button.position;
    return { x: d3.event.x, y: d3.event.y, button, startPos, cursor: d3.select(dragged).attr('cursor') };
  }

  private btnDragStart(mv: MessageView, dragged: SVGElement) {
    d3.select(dragged).attr('cursor', 'none');
    mv.group.classed('active', true);
  }

  private linkDragging(mv: MessageView) {
    this.btnDragging(
      mv, thatId => thatId != mv.msg['@id'] && !mv.msg.linkTo.includes(thatId), 'link-target');
  }

  private linkDragEnd(mv: MessageView, dragged: SVGElement) {
    this.btnDragEnd(dragged, mv, thatId => mv.msg.linkTo.push(thatId), 'link-target');
  }

  private unlinkDragging(mv: MessageView) {
    this.btnDragging(
      mv, thatId => thatId != mv.msg['@id'] && mv.msg.linkTo.includes(thatId), 'unlink-target');
  }

  private unlinkDragEnd(mv: MessageView, dragged: SVGElement) {
    this.btnDragEnd(dragged, mv,
      thatId => mv.msg.linkTo = mv.msg.linkTo.filter(thisId => thatId != thisId), 'unlink-target');
  }

  private btnDragging(mv: MessageView, filter: (thatId: string) => boolean, targetClass: string) {
    mv.group.raise(); // So that the button drags over other messages
    const drag = d3.event.subject, [cx, cy] = drag.button.position;
    drag.button.position = [cx + d3.event.dx, cy + d3.event.dy];
    // Hit-test for other messages
    const target = this.hitTest(this.svgRect(drag.button.group.node()), filter);
    if (!MessageView.same(drag.target, target)) {
      target && target.box.classed(targetClass, true);
      drag.target && drag.target.box.classed(targetClass, false);
    }
    drag.target = target;
  }

  private btnDragEnd(
    dragged: SVGElement, mv: MessageView, commit: (thatId: string) => void, targetClass: string) {
    const drag = d3.event.subject;
    d3.select(dragged).attr('cursor', drag.cursor);
    if (drag.target) {
      drag.target.box.classed(targetClass, false);
      commit(drag.target.msg['@id']);
      mv.update();
    }
    drag.button.position = drag.startPos;
    mv.group.classed('active', false);
  }

  private addNewMessage(mv: MessageView) {
    const id = shortId();
    mv.msg.linkTo.push(id);
    // TODO: Prevent collisions
    this.board.add({ '@id': id, text: '', x: mv.msg.x + 50, y: mv.msg.y + 100, linkTo: [] });
    this.withThatMessage(id, mv => mv.text.node().focus());
  }

  hitTest(test: Rectangle, filter: (id: string) => boolean): MessageView {
    // May need to be optimised with e.g. rbush
    const foundNode = this.svg.selectAll('.board-message').filter(this.withThisMessage(mv => {
      return mv.rect.intersects(test) && filter(mv.msg['@id']);
    })).node();
    return foundNode && new MessageView(<Element>foundNode, this);
  }

  withThisMessage(action: (mv: MessageView, el: SVGElement) => any): (this: Element) => any {
    const bv = this;
    return function (this: SVGElement) {
      return action.call(bv, new MessageView(this, bv), this);
    }
  }

  withThatMessage(thatId: string, action: (mv: MessageView) => any) {
    this.svg.select(`#${thatId}`).each(this.withThisMessage(action));
  }

  append(el: Element): Element {
    return this.svg.node().insertAdjacentElement('beforeend', el);
  }
}
