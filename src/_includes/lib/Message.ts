import { Subject, Reference } from '@m-ld/m-ld';

export interface Message extends Subject {
  '@id': string;
  '@type': 'Message';
  text: string;
  x: number;
  y: number;
  linkTo: Reference[];
}