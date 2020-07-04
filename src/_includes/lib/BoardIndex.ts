import type RBush from 'rbush';
import { Resource, Reference } from '@m-ld/m-ld';
import { Message } from './Message';
import { Rectangle } from './Shapes';

// This is required because rbush's exports are broken
const MessageBush: new () => RBush<MessageItem> = require('rbush');

export const MIN_MESSAGE_SIZE: [number, number] = [115, 50];

/**
 * Spatial index for a message board. Indexes message locations based on merged
 * position and extent. For a consumer that is able to render board message
 * HTML, message extent can be specified directly; otherwise, a sane
 * approximation should be computed. Finds a location for new messages based on
 * message linkage, with a preference for left-to-right then top-to-bottom
 * reading order.
 */
export class BoardIndex extends MessageBush {
  update(item: MessageItem): BoardIndex {
    this.remove(item);
    if (!item.deleted)
      this.insert(item);
    return this;
  }

  remove(item: MessageItem): BoardIndex {
    super.remove(item, (a, b) => a['@id'] === b['@id']);
    return this;
  }

  findSpace(near: MessageItem,
    size: [number, number] = MIN_MESSAGE_SIZE,
    startDistance: number = 50,
    startTheta: number = 3 * Math.PI / 2,
    margin: number = 20): [number, number] | undefined {
    for (let dTheta = 0; dTheta < 100; dTheta++) {
      // Spiral out anticlockwise from the given message's centre
      const [nx, ny] = near.centre,
        theta = startTheta + dTheta, // 1 radian increments
        distance = (Math.floor(dTheta / (Math.PI * 2)) + 1) * startDistance,
        x = (Math.cos(theta) * distance) + nx,
        y = (Math.sin(theta) * distance) + ny;
      if (!this.collides(new Rectangle([x, y], size).expand(margin)))
        return [x, y];
    }
  }
}

/**
 * Immutable wrapper for a message, which resolves position and text conflicts.
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