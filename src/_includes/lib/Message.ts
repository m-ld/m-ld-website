import { Subject, Reference } from '@gsvarovsky/m-ld/dist/m-ld/jsonrql';

export interface Message extends Subject {
  '@id': string;
  '@type': 'Message';
  text: string;
  x: number;
  y: number;
  linkTo: Reference[];
}