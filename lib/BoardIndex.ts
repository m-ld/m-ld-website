import { EventEmitter } from 'events';
import type RBush from 'rbush';
import { MessageItem } from './Message';
import { Rectangle } from './Shapes';

// This is required because rbush's exports are broken
const MessageBush: new () => RBush<MessageItem> = require('rbush');

export const MIN_MESSAGE_SIZE: [number, number] = [115, 50];

export interface BoardIndex {
  on(event: 'insert' | 'remove', handler: (items: MessageItem[]) => any): void;

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

  on(event: 'insert' | 'remove', handler: (items: MessageItem[]) => any) {
    this.events.on(event, handler);
  }

  get(id: string): MessageItem | undefined {
    return this.all().filter(item => item['@id'] === id)[0];
  }

  load(items: ReadonlyArray<MessageItem>): BoardBushIndex {
    super.load(items);
    items.forEach(item => this.top.add(item['@id']));
    this.events.emit('insert', items);
    return this;
  }

  insert(item: MessageItem): BoardBushIndex {
    super.insert(item);
    this.top.add(item['@id']);
    this.events.emit('insert', [item]);
    return this;
  }

  update(item: MessageItem): BoardBushIndex {
    // Note that the remove and re-insert also maintains the 'top' ordering.
    this.remove(item);
    if (!item.deleted)
      this.insert(item);
    return this;
  }

  remove(item: MessageItem): BoardBushIndex {
    // Bug in RBush https://github.com/mourner/rbush/issues/95
    const prev = this.all().find(prev => prev['@id'] === item['@id']);
    if (prev != null) {
      super.remove(prev);
      this.top.delete(item['@id']);
      this.events.emit('remove', [item]);
    }
    return this;
  }

  clear(): BoardBushIndex {
    const items = this.all();
    super.clear();
    // Clear is called before class initialisation
    this.events?.emit('remove', items);
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
