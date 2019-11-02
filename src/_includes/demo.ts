import { BoardView } from './lib/BoardView';
import { MessageView } from './lib/MessageView';

window.onload = function () {
  MessageView.sync([
    { '@id': 'a1234567', text: 'Hello!', x: 200, y: 100, linkTo: ['b1234567'] },
    { '@id': 'b1234567', text: 'Well hello!', x: 300, y: 300, linkTo: [] }
  ], new BoardView());
}