import { View } from './lib/View';

window.onload = function () {
  new View().showMessages([
    { '@id': '12345678', text: 'Hello!', x: 200, y: 100 },
    { '@id': '12445678', text: 'Well hello!', x: 300, y: 300 }
  ]);
}