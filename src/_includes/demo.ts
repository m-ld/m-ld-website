import { BoardView } from './lib/BoardView';
import { Board } from './lib/Board';

window.onload = function () {
  new BoardView('#board', new Board(
    { '@id': 'a1234567', text: 'Hello!', x: 200, y: 100, linkTo: ['b1234567'] },
    { '@id': 'b1234567', text: 'Well hello!', x: 250, y: 200, linkTo: [] }
  ));
}