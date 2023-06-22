import {
  any, array, Describe, MeldReadState, MeldState, Reference, shortId, Subject
} from '@m-ld/m-ld';
import { Observable } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { Rectangle } from './Shapes';

export interface Message {
  '@id': string;
  text: string;
  x: number;
  y: number;
  linkTo: Reference[];
}

export interface MessageSubject extends Subject {
  '@id': string;
  '@type': 'Message';
  text?: string;
  x?: number | number[];
  y?: number | number[];
  linkTo?: Reference[];
}

export namespace MessageSubject {
  export function create(init: Partial<Message>): MessageSubject {
    const id = init['@id'] ?? shortId();
    return {
      '@id': id,
      '@type': 'Message',
      text: init.text,
      x: init.x,
      y: init.y,
      linkTo: init.linkTo
    };
  }

  export function textId(id: string): string {
    return `${id}_text`;
  }

  export function loadAll(state: MeldReadState): Observable<MessageSubject> {
    return state.read<Describe>({
      '@describe': '?id',
      '@where': { '@id': '?id', '@type': 'Message' }
    }).pipe(mergeMap(async subject => {
      return { ...subject } as MessageSubject;
    }));
  }

  export function remove(state: MeldState, src: MessageSubject) {
    // Delete the message including any links to it
    const patterns = [
      { '@id': src['@id'], [any()]: any() },
      { '@id': any(), linkTo: { '@id': src['@id'] } }
    ];
    return state.write({
      '@delete': patterns,
      '@where': { '@union': patterns }
    });
  }
}

/**
 * Immutable wrapper for a message, which resolves position conflicts,
 * maintains a size and signals deletion.
 */
export class MessageItem extends Rectangle {
  readonly '@id': string;
  readonly linkTo: Reference[];
  readonly deleted: boolean;

  constructor(src: MessageSubject, size?: [number, number]) {
    super([
      Math.min(...array(src.x)),
      Math.min(...array(src.y))
    ], size ?? [0, 0]);
    this['@id'] = src['@id'];
    this.linkTo = array(src.linkTo);
    this.deleted = src['@type'] == null;
  }
}