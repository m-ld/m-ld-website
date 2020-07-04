import type RBush from 'rbush';
import { Resource, Reference } from '@m-ld/m-ld';
import { Message } from './Message';
import { Rectangle, Line } from './Shapes';

// This is required because rbush's exports are broken
const MessageBush: new () => RBush<MessageItem> = require('rbush');

export const MIN_MESSAGE_SIZE: [number, number] = [115, 50];

/**
 * Finds a location for new messages, with a preference for left-to-right then
 * top-to-bottom reading order.
 */
export interface BoardIndex {
  all(): MessageItem[];

  search(box: Rectangle): MessageItem[];

  collides(box: Rectangle): boolean;

  findSpace(near: MessageItem,
    size?: [number, number],
    startTheta?: number,
    margin?: number): [number, number];
}

/**
 * Spatial index for a message board. Indexes message locations based on merged
 * position and extent. For a consumer that is able to render board message
 * HTML, message extent can be specified directly; otherwise, a sane
 * approximation should be computed.
 */
export class BoardBushIndex extends MessageBush implements BoardIndex {
  update(item: MessageItem): BoardBushIndex {
    this.remove(item);
    if (!item.deleted)
      this.insert(item);
    return this;
  }

  remove(item: MessageItem): BoardBushIndex {
    const prev = this.all().find(prev => prev['@id'] === item['@id']);
    if (prev != null)
      super.remove(prev);
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
        return [x, y];
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
}

/**
 * Immutable wrapper for a message, which resolves position and text conflicts
 * and maintains a size.
 */
export class MessageItem extends Rectangle implements Message {
  readonly text: string;
  readonly '@type' = 'Message';
  private readonly src: Resource<Message>;

  constructor(
    src: Resource<Message>,
    size?: [number, number]) {
    super(MessageItem.mergePosition([src.x, src.y]), size ?? [0, 0]);
    this.src = deepClone(src);
    this.text = MessageItem.mergeText(src.text);
  }

  get '@id'() {
    return this.src['@id'];
  }

  get linkTo(): Reference[] {
    return this.src.linkTo;
  }

  get resource(): Resource<Message> {
    return deepClone(this.src);
  }

  get deleted(): boolean {
    return !this.src.text.length && this.src.text !== '';
  }

  static mergeText(value: string | string[]): string {
    return Array.isArray(value) ? value.join('<br>') : value;
  }

  static mergePosition([xs, ys]: [number | number[], number | number[]]): [number, number] {
    return [
      Array.isArray(xs) ? Math.min(...xs) : xs,
      Array.isArray(ys) ? Math.min(...ys) : ys
    ];
  }
}

// Defensive deep copy, where performance not a concern
const deepClone = <T>(src: T) => JSON.parse(JSON.stringify(src));