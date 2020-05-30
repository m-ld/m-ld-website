import * as d3 from 'd3';
import { Message } from './Message';
import { svgParent, getAttr } from './util';
import { InfiniteView } from './InfiniteView';
import { MessageView } from './MessageView';
import { GroupUI } from './GroupUI';
import { Rectangle, Circle, Shape, Line } from './Shapes';
import { map, toArray } from 'rxjs/operators';
import { MeldApi } from '@gsvarovsky/m-ld';
// FIXME: Tidy up m-ld utility exports
import { shortId } from '@gsvarovsky/m-ld/dist/util';
import { Subject, Select, Describe, Update, Reference, Resource } from '@gsvarovsky/m-ld/dist/m-ld/jsonrql';
import { LinkView } from './LinkView';

const CLICK_DRAG_DISTANCE = 3;

export class BoardView extends InfiniteView {
  constructor(
    selectSvg: string,
    private readonly meld: MeldApi,
    private readonly welcomeId: string) {
    super(selectSvg);

    // Sync all the messages in the given board now
    meld.transact({
      '@describe': '?s', '@where': { '@id': '?s', '@type': 'Message' }
    } as Describe).pipe(toArray()).subscribe(
      subjects => this.sync(MeldApi.asSubjectUpdates({
        '@insert': { '@graph': subjects }, '@delete': { '@graph': [] }
      })),
      this.warnError);

    // Follow changes to messages
    meld.follow().subscribe(update => {
      // Construct subject updates from the group updates
      this.sync(MeldApi.asSubjectUpdates(update));
    });
  }

  async linksTo(id: string): Promise<string[]> {
    return this.meld.transact({
      '@select': '?s',
      '@where': { '@id': '?s', linkTo: { '@id': id } }
    } as Select).pipe(
      map(selection => (selection['?s'] as Reference)['@id']),
      toArray()).toPromise();
  }

  get messages(): Resource<Message>[] {
    return this.svg.selectAll('.board-message').data() as Resource<Message>[];
  }

  private sync(updates: MeldApi.SubjectUpdates) {
    this.svg.selectAll('.board-message')
      // Apply the given updates to the board messages
      .data(this.applyUpdates(updates), function (this: Element, msg: Resource<Message>) {
        return msg ? msg['@id'] : this.id;
      })
      .join(
        enter => {
          enter = enter
            .select(() => this.append(MessageView.createMessageViewNode()))
            .classed('board-message', true)
            .attr('id', msg => msg['@id'])
            .each(this.withThisMessage(mv => mv.position = mv.msgPosition));
          enter.select('.board-message-body > div')
            .text(msg => MessageView.mergeText(msg.text))
            .on('focus', this.withThisMessage(mv => mv.group.raise()))
            .on('input', this.withThisMessage(mv => mv.update()))
            .on('blur', this.withThisMessage(this.inputEnd));
          enter.select('.board-message-close circle')
            .on('click', this.withThisMessage(this.removeMessage))
            .call(this.setupBtnDrag(this.unlinkDragging, this.unlinkDragEnd));
          enter.select('.board-message-add circle')
            .on('click', this.withThisMessage(mv => this.addNewMessage(mv)))
            .call(this.setupBtnDrag(this.linkDragging, this.linkDragEnd));
          enter.selectAll('.board-message-move circle').call(d3.drag()
            .container(this.svg.node())
            .on('start', this.withThisMessage(this.moveDragStart))
            .on('drag', this.withThisMessage(this.moveDragging))
            .on('end', this.withThisMessage(this.moveDragEnd)));
          enter.select('.board-message-code circle')
            .on('click', this.withThisMessage(mv => mv.toggleCode()));
          return enter;
        },
        update => update, // will be updated in a mo
        exit => exit.each(this.withThisMessage(mv => mv.remove()))
      )
      // Update everyone from data, including the new folks
      .each(this.withThisMessage(mv => mv.update('fromData')));
  }

  private applyUpdates(updates: MeldApi.SubjectUpdates) {
    return this.messages
      .map(msg => {
        if (updates[msg['@id']]) {
          // Update this message
          MeldApi.update(msg, updates[msg['@id']]);
          delete updates[msg['@id']]; // Side-effect: consumed the update
        }
        return msg;
      })
      .concat(Object.entries(updates).map(([id, update]) => {
        // Any remaining updates are new messages
        const msg: Resource<Message> =
          { '@id': id, '@type': 'Message', text: [], x: [], y: [], linkTo: [] };
        MeldApi.update(msg, update);
        return msg;
      }))
      // Remove any messages that have become invalid (deleted)
      .filter(msg => msg.text.length || msg.text === '');
  }

  private setupBtnDrag(dragging: (mv: MessageView) => void,
    dragEnd: (mv: MessageView, dragged: SVGElement) => void):
    (selection: d3.Selection<d3.BaseType, unknown, Element, unknown>) => void {
    return d3.drag() // Set up drag-to-link behaviour
      .container(this.svg.node())
      .clickDistance(CLICK_DRAG_DISTANCE) // Ensure that single-click hits click handler
      .subject(this.withThisMessage(this.btnDragSubject))
      .on('start', this.withThisMessage(this.btnDragStart))
      .on('drag', this.withThisMessage(dragging))
      .on('end', this.withThisMessage(dragEnd));
  }

  private inputEnd(mv: MessageView) {
    // Commit the change to the message
    if (mv.msgText !== mv.text) {
      this.meld.transact({
        '@insert': { '@id': mv.msg['@id'], text: mv.text },
        '@delete': { '@id': mv.msg['@id'], text: mv.msg.text }
      } as Update).toPromise().catch(this.warnError);
    }
  }

  private moveDragStart(_: MessageView, dragged: SVGElement) {
    d3.select(dragged).attr('cursor', 'none');
  }

  private moveDragging(mv: MessageView) {
    // Do not modify the message data here, just the visual location
    const [x, y] = mv.position;
    mv.group.raise();
    mv.position = [x + d3.event.dx, y + d3.event.dy];
    mv.update(); // To keep the lines attached
  }

  private moveDragEnd(mv: MessageView, dragged: SVGElement) {
    d3.select(dragged).attr('cursor', 'grab');
    // Commit the change to the message
    const [x, y] = mv.position;
    this.meld.transact({
      '@insert': { '@id': mv.msg['@id'], x, y },
      '@delete': { '@id': mv.msg['@id'], x: mv.msg.x, y: mv.msg.y }
    } as Update).toPromise().catch(this.warnError);
  }

  private btnDragSubject(mv: MessageView, dragged: SVGElement): DragSubject {
    const button = new GroupUI(<SVGGElement>svgParent(dragged)), startPos = button.position;
    return {
      button, startPos, cursor: d3.select(dragged).attr('cursor'),
      link: new LinkView(this.svg, mv.msg['@id'], shortId())
    };
  }

  private btnDragStart(mv: MessageView, dragged: SVGElement) {
    d3.select(dragged).attr('cursor', 'none');
    mv.group.classed('active', true);
  }

  private linkDragging(mv: MessageView) {
    this.btnDragging(
      mv, thatId => thatId != mv.msg['@id'] &&
        !MeldApi.includesValue(mv.msg.linkTo, { '@id': thatId }), 'link-target');
  }

  private linkDragEnd(mv: MessageView, dragged: SVGElement) {
    this.btnDragEnd(dragged, mv, (thatId, position) => {
      if (thatId != null) {
        this.meld.transact({
          '@insert': { '@id': mv.msg['@id'], linkTo: { '@id': thatId } }
        } as Update).toPromise().catch(this.warnError);
      } else {
        this.addNewMessage(mv, position);
      }
    }, 'link-target');
  }

  private unlinkDragging(mv: MessageView) {
    this.btnDragging(
      mv, thatId => thatId != mv.msg['@id'] &&
        MeldApi.includesValue(mv.msg.linkTo, { '@id': thatId }), 'unlink-target');
  }

  private unlinkDragEnd(mv: MessageView, dragged: SVGElement) {
    this.btnDragEnd(dragged, mv, thatId => {
      if (thatId != null) {
        this.meld.transact({
          '@delete': { '@id': mv.msg['@id'], linkTo: { '@id': thatId } }
        } as Update).toPromise().catch(this.warnError);
      }
    }, 'unlink-target');
  }

  private btnDragging(mv: MessageView, filter: (thatId: string) => boolean, targetClass: string) {
    mv.group.raise(); // So that the button drags over other messages
    const drag: DragSubject = d3.event.subject, [cx, cy] = drag.button.position;
    drag.button.position = [cx + d3.event.dx, cy + d3.event.dy];
    // Hit-test for other messages
    const target = this.hitTest(this.svgRect(drag.button.group.node()), filter);
    this.updateDragLink(drag, mv, targetClass, target);
    if (!MessageView.same(drag.target, target)) {
      if (target)
        target.box.classed(targetClass, true);
      if (drag.target)
        drag.target.box.classed(targetClass, false);
    }
    drag.target = target;
  }

  private updateDragLink(drag: DragSubject, mv: MessageView, targetClass: string, target: MessageView) {
    let toShape: Shape;
    if (target != null) {
      toShape = target.rect;
    } else {
      const [x, y] = this.svgRect(drag.button.group.node()).topLeft;
      const [r] = getAttr(drag.button.group.select('circle'), Number, 'r');
      toShape = new Circle([x + r, y + r], r);
    }
    drag.link.update(mv.rect, toShape);
    drag.link.line.classed(targetClass, true);
    drag.link.line.raise();
  }

  private btnDragEnd(
    dragged: SVGElement,
    mv: MessageView,
    commit: (thatId: string | null, position: [number, number]) => void,
    targetClass: string) {
    const drag: DragSubject = d3.event.subject;
    d3.select(dragged).attr('cursor', drag.cursor);
    if (drag.target)
      drag.target.box.classed(targetClass, false);
    if (new Line(drag.startPos, drag.button.position).length > CLICK_DRAG_DISTANCE)
      commit(drag.target ? drag.target.msg['@id'] : null,
        this.svgRect(drag.button.group.node()).topLeft);
    drag.link.line.remove();
    drag.button.position = drag.startPos;
    mv.group.classed('active', false);
  }

  private addNewMessage(mv: MessageView, position?: [number, number]) {
    const id = shortId();
    let [x, y] = position ?? mv.msgPosition;
    if (position == null) {
      // TODO: Prevent collisions
      x += 50;
      y += 100;
    }
    const newMessage: Resource<Message> = {
      '@id': id, '@type': 'Message', text: '', x, y, linkTo: []
    };
    const newLink: Subject = {
      '@id': mv.msg['@id'],
      linkTo: [{ '@id': id }]
    };
    this.meld.transact({ '@insert': [newMessage, newLink] } as Update).toPromise()
      .then(() => this.withThatMessage(id, mv => mv.content.node().focus()), this.warnError);
  }

  private removeMessage(mv: MessageView): any {
    if (mv.msg['@id'] !== this.welcomeId)
      return this.meld.delete(mv.msg['@id']);
    else
      this.warnError("Sorry, you can't delete the welcome message");
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

  warnError = (err: any) => d3.select('#warning')
    .classed('is-hidden', false)
    .select('.warning-text').text(`${err}`);
}

interface DragSubject {
  button: GroupUI;
  startPos: [number, number];
  cursor: string;
  target?: MessageView;
  link: LinkView;
}