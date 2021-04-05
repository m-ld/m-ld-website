import { any, array, MeldReadState, MeldState, Reference, shortId, Subject } from '@m-ld/m-ld';
import { Construct } from '@m-ld/m-ld/dist/jrql-support';
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
  text?: {
    '@id': string,
    '@list': string[]
  };
  x?: number | number[];
  y?: number | number[];
  linkTo?: Reference[];
}

const TAG_REGEX = /(<[^>]+>)/;
export function splitHtml<T>(
  html: string, mapText: (text: string) => T, mapTag: (tag: string) => T): T[] {
  return html.split(TAG_REGEX).map(
    frag => frag.match(TAG_REGEX) == null ? mapText(frag) : mapTag(frag));
}

export namespace MessageSubject {
  export function create(init: Partial<Message>): MessageSubject {
    const id = init['@id'] ?? shortId();
    const text = init.text == null ? [] : ([] as string[]).concat(
      // Split text into characters, keep HTML tags atomic
      ...splitHtml(init.text, text => [...text], tag => [tag]));
    return {
      '@id': id,
      '@type': 'Message',
      text: {
        '@id': `${id}_text`,
        '@list': text
      },
      x: init.x,
      y: init.y,
      linkTo: init.linkTo
    };
  };

  export function load(state: MeldReadState, id = '?') {
    return state.read<Construct>({
      '@construct': {
        '@id': id,
        '@type': 'Message',
        text: {
          '@id': '?',
          '@list': { '?': '?' }
        },
        x: '?',
        y: '?',
        linkTo: '?'
      }
    })
  }

  export function remove(state: MeldState, src: MessageSubject) {
    const patterns = [
      { '@id': src['@id'], [any()]: any() },
      { '@id': any(), linkTo: { '@id': src['@id'] } }
    ].concat(src.text != null ?
      { '@id': src.text['@id'], [any()]: any() } : []);
    // Delete the message including its text, and any links to it
    return state.write({
      '@delete': patterns,
      '@where': { '@union': patterns }
    });
  }
}

/**
 * Immutable wrapper for a message, which resolves position and text conflicts,
 * maintains a size and signals deletion.
 */
export class MessageItem extends Rectangle implements Message {
  readonly text: string;
  readonly textData: string[];
  readonly '@id': string;
  readonly linkTo: Reference[];
  readonly deleted: boolean;

  constructor(src: MessageSubject, size?: [number, number]) {
    super([
      Math.min.apply(Math, array(src.x)),
      Math.min.apply(Math, array(src.y))
    ], size ?? [0, 0]);
    this['@id'] = src['@id'];
    this.linkTo = array(src.linkTo);
    this.deleted = src.text == null;
    this.textData = src.text?.['@list'] ?? [];
    this.text = this.textData.join('');
  }
}