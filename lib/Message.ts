import { Reference, Subject } from '@m-ld/m-ld';

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
  text?: string | string[];
  x?: number | number[];
  y?: number | number[];
  linkTo?: Reference[];
}