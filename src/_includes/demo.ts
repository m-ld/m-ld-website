import { BoardView } from './lib/BoardView';
import { MessageView } from './lib/MessageView';

window.onload = function () {
  MessageView.sync([
    { '@id': '12345678', text: 'Hello!', x: 200, y: 100 },
    { '@id': '12445678', text: 'Well hello!', x: 300, y: 300 }
  ], new BoardView());
}