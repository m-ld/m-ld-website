import {
  any, array, Describe, MeldReadState, MeldState, Reference, shortId, Subject
} from '@m-ld/m-ld';
import { isPropertyObject, isReference } from '@m-ld/m-ld/ext/jrql-support';
import { Observable } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { Rectangle } from './Shapes';
import { applyPatch, getPatch } from 'fast-array-diff';

export interface Message {
  '@id': string;
  text: string;
  x: number;
  y: number;
  linkTo: Reference[];
}

type ListText = { '@id': string, '@list': string[] };
type StringText = string | string[];
/**
 * Feature flag for using list text
 */
const USING_LIST_TEXT = false;
export function isStringText(text?: StringText | ListText): text is StringText {
  return Array.isArray(text) ? text.every(isStringText) : typeof text == 'string';
}

function listText(text: string | undefined) {
  return text == null ? [] : ([] as string[]).concat(
    // Split text into characters, keep HTML tags atomic
    ...splitHtml(text, text => [...text], tag => [tag]));
}

export interface MessageSubject extends Subject {
  '@id': string;
  '@type': 'Message';
  text?: StringText | ListText;
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
    return {
      '@id': id,
      '@type': 'Message',
      text: USING_LIST_TEXT ? {
        '@id': textId(id),
        '@list': listText(init.text)
      } : init.text,
      x: init.x,
      y: init.y,
      linkTo: init.linkTo
    };
  }

  export function textId(id: string): string {
    return `${id}_text`;
  }

  export function load(state: MeldReadState): Observable<MessageSubject> {
    return state.read<Describe>({
      '@describe': '?id',
      '@where': { '@id': '?id', '@type': 'Message' }
    }).pipe(mergeMap(async subject => {
      const src = { ...subject } as MessageSubject;
      // Check for ListText
      if (isPropertyObject('text', src.text) && isReference(src.text))
        src.text = (await state.get(src.text['@id'])) as ListText;
      return src;
    }));
  }

  export function remove(state: MeldState, src: MessageSubject) {
    const patterns = [
      { '@id': src['@id'], [any()]: any() },
      { '@id': any(), linkTo: { '@id': src['@id'] } }
    ].concat(src.text != null && !isStringText(src.text) ?
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
  readonly textList: string[];
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
    if (isStringText(src.text))
      this.textList = mergeTexts(array(src.text));
    else
      this.textList = src.text?.['@list'] ?? [];
    this.text = this.textList.join('');
  }
}

function mergeTexts(texts: string[]): string[] {
  return texts.sort().reduce((merged, text) => mergeAdd(merged, listText(text)), []);
}

function mergeAdd(a: string[], b: string[]): string[] {
  return applyPatch(a, getPatch(a, b).filter(p => p.type === 'add'));
}