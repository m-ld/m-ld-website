import { EventEmitter } from 'events';
import type RBush from 'rbush';
import { MessageItem } from './Message';
import { Rectangle } from './Shapes';

// This is required because rbush's exports are broken
const MessageBush: new () => RBush<MessageItem> = require('rbush');

export const MIN_MESSAGE_SIZE: [number, number] = [115, 50];

export namespace BoardIndex {
  export type Event = 'insert' | 'update' | 'remove';
  export type EventHandler = (item: MessageItem) => any;
}

export interface BoardIndex {
  on(event: BoardIndex.Event, handler: BoardIndex.EventHandler): void;

  off(event: BoardIndex.Event, handler: BoardIndex.EventHandler): void;

  get(id: string): MessageItem | undefined;

  all(): MessageItem[];

  search(box: Rectangle): MessageItem[];

  collides(box: Rectangle): boolean;

  /**
   * Finds a location for new messages, with a preference for left-to-right then
   * top-to-bottom reading order.
   */
  findSpace(near: MessageItem,
    size?: [number, number],
    startTheta?: number,
    margin?: number): [number, number];

  /**
   * Gets the most important messages on the board, e.g. for bot reaction.
   * Messages from the current board user and new messages rank highest.
   */
  topMessages(count?: number, excludeIds?: Set<string>): string[];
}

/**
 * Spatial index for a message board. Indexes message locations based on merged
 * position and extent. For a consumer that is able to render board message
 * HTML, message extent can be specified directly; otherwise, a sane
 * approximation should be computed.
 */
export class BoardBushIndex extends MessageBush implements BoardIndex {
  // Maintains insertion order, so top message is last
  private top = new Set<string>();
  private events = new EventEmitter;

  on(event: BoardIndex.Event, handler: BoardIndex.EventHandler) {
    this.events.on(event, handler);
  }

  off(event: BoardIndex.Event, handler: BoardIndex.EventHandler) {
    this.events.on(event, handler);
  }

  private emit(event: BoardIndex.Event, item: MessageItem) {
    // Clear is called before class initialisation
    this.events?.emit(event, item);
  }

  get(id: string): MessageItem | undefined {
    return this.all().find(item => item['@id'] === id);
  }

  insert(item: MessageItem): BoardBushIndex {
    super.insert(item);
    this.top.add(item['@id']);
    this.emit('insert', item);
    return this;
  }

  update(item: MessageItem): BoardBushIndex {
    if (item.deleted)
      return this.remove(item);
    const prev = this.get(item['@id']);
    if (prev == null)
      return this.insert(item);
    super.remove(prev);
    super.insert(item);
    this.top.delete(item['@id']);
    this.top.add(item['@id']);
    this.emit('update', prev);
    return this;
  }

  remove(item: MessageItem): BoardBushIndex {
    // Bug in RBush https://github.com/mourner/rbush/issues/95
    const prev = this.get(item['@id']);
    if (prev != null) {
      super.remove(prev);
      this.top.delete(item['@id']);
      this.emit('remove', item);
    }
    return this;
  }

  findSpace(near: MessageItem,
    size: [number, number] = MIN_MESSAGE_SIZE,
    startTheta: number = Math.PI / 2,
    margin: number = 20): [number, number] {
    const [nx, ny] = near.centre, [width, height] = size;
    let shell = 1, distance = margin, theta = startTheta;
    for (let i = 0; i < 100; i++) {
      const x = (Math.cos(theta) * distance) + nx - (width / 2),
        y = (Math.sin(theta) * distance) + ny - (height / 2),
        rect = new Rectangle([x, y], size).expand(margin);
      if (near.expand(margin).intersects(rect)) {
        distance += margin + 1;
      } else if (!this.collides(rect)) {
        return rect.topLeft;
      } else {
        // Spiral out anticlockwise from the given message's centre
        const nextShell = Math.floor(Math.abs(theta - startTheta) / (Math.PI * 2)) + 1;
        if (nextShell !== shell) {
          distance += margin;
          shell = nextShell;
        }
        theta -= 1 / shell; // Smaller increments as we go wider
      }
    }
    // Sane default if we can't find a gap
    return [nx, ny + height];
  }

  topMessages(count?: number, excludeIds?: Set<string>): string[] {
    return Array.from(this.top)
      .reverse().filter(id => excludeIds == null || !excludeIds.has(id))
      .slice(0, count).map(id => this.get(id)?.text ?? ''); // Should exist
  }
}
