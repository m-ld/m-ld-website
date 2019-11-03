import { BoardView } from './lib/BoardView';
import { Board } from './lib/Board';
import { shortId } from './lib/util';
import { Message } from './lib/Message';

window.onload = function () {
  const hello: Message = {
    '@id': shortId(),
    text: 'Hello!',
    x: 200, y: 100,
    linkTo: ['b1234567']
  };
  const board = new Board(hello);
  new BoardView('#board', board);
  setTimeout(() => {
    const msg1: Message = {
      '@id': shortId(), text:
        'This is your new collaborative message board.',
      x: 250, y: 200,
      linkTo: []
    };
    hello.linkTo.push(msg1["@id"]);
    board.add(msg1);

    setTimeout(() => {
      const msg2: Message = {
        '@id': shortId(),
        text: "We'll use it to demonstrate how m-ld works.",
        x: 300, y: 300,
        linkTo: []
      };
      msg1.linkTo.push(msg2["@id"]);
      board.add(msg2);
    }, 2000);
  }, 2000);
}