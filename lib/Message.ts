import { Reference } from '@m-ld/m-ld';

export interface Message {
  '@id': string;
  '@type': 'Message';
  text: string;
  x: number;
  y: number;
  linkTo: Reference[];
}