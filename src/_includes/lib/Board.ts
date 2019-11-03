import { Message } from "./Message";
import { EventEmitter } from 'events';
import StrictEventEmitter from 'strict-event-emitter-types';

interface BoardEvents {
  add: (msg: Message) => void;
  remove: (msg: Message) => void;
}

export class Board {
  events: StrictEventEmitter<EventEmitter, BoardEvents> = new EventEmitter;
  private messagesById: { [key: string]: Message } = {};

  constructor(...messages: Message[]) {
    messages.forEach(msg => this.messagesById[msg["@id"]] = msg);
  }

  add(msg: Message): boolean {
    if (!this.messagesById[msg["@id"]]) {
      this.messagesById[msg["@id"]] = msg;
      this.events.emit('add', msg);
      return true;
    }
    return false;
  }

  remove(id: string): boolean {
    if (this.messagesById[id]) {
      const msg = this.messagesById[id];
      delete this.messagesById[id];
      this.events.emit('remove', msg);
      return true;
    }
    return false;
  }

  linksTo(id: string): string[] {
    return this.messages.filter(msg => msg.linkTo.includes(id)).map(msg => msg["@id"]);
  }

  get messages() {
    return Object.values(this.messagesById);
  }
}