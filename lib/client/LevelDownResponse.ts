import { AbstractLevel } from 'abstract-level';
import { decode } from '@ably/msgpack-js';

export function int32Buf(int: number) {
  return new Uint8Array(new Uint32Array([int]).buffer);
}

export function buf32Int(buf: Uint8Array) {
  return new Uint32Array(buf.slice(0, Uint32Array.BYTES_PER_ELEMENT).buffer)[0];
}

export class LevelDownResponse {
  private buffer = new Uint8Array(0);
  private pos = 0;

  static async readInto(
    backend: AbstractLevel<any, string, Buffer>, response: Response
  ) {
    if (response.headers.get('Content-Type') !== 'application/octet-stream')
      throw new Error('Unsupported content type');
    if (response.body != null) {
      const reading = new LevelDownResponse(response.body.getReader());
      while (true) {
        const [key, value] = await reading.read();
        if (key != null && value != null)
          await backend.put(
            // Must convert value to Buffer because memdown detects Buffer._isBuffer
            Buffer.from(key).toString(), Buffer.from(value), { valueEncoding: 'buffer' });
        else
          break;
      }
    }
  }

  static readFrom(
    backend: AbstractLevel<any, string, Buffer>,
    type: 'application/octet-stream' | 'application/json' = 'application/octet-stream'
  ): Response {
    const iterator = backend.iterator({ valueEncoding: 'buffer' });
    let i = 0;
    const stream = new ReadableStream({
      async pull(controller) {
        iterator.next((err, key, value) => {
          if (err) {
            iterator.close().catch(console.warn);
            controller.error(err);
          } else if (key == null || value == null) {
            iterator.close().catch(console.warn);
            if (type === 'application/json')
              controller.enqueue(Buffer.from('\n}'));
            controller.close();
          } else {
            switch (type) {
              case 'application/octet-stream':
                controller.enqueue(new Uint8Array([
                  ...int32Buf(key.length), ...Buffer.from(key),
                  ...int32Buf(value.length), ...value
                ]));
                break;
              case 'application/json':
                // Key may emerge as a buffer
                const keyStr = Buffer.from(key).toString('utf8');
                const kvpStr = JSON.stringify({
                  // Using some insider knowledge of the persistence format
                  [keyStr]: keyStr.startsWith('_qs:') ? decode(value) : value
                }).slice(1, -1);
                controller.enqueue(Buffer.from(`${i++ ? ',' : '{'}\n${kvpStr}`));
                break;
            }
          }
        });
      }
    });
    const headers = new Headers({ 'Content-Type': type });
    return new Response(stream, { headers });
  }

  constructor(
    readonly reader: ReadableStreamDefaultReader<Uint8Array>) {
  }

  async read(): Promise<[Uint8Array, Uint8Array] | []> {
    const key = await this.readNext();
    if (key != null) {
      const value = await this.readNext();
      if (value == null)
        throw new Error('Unexpected EOF');
      return [key, value];
    }
    return [];
  }

  async readNext(): Promise<Uint8Array | null> {
    const lenBuf8 = await this.readUint8s(Uint32Array.BYTES_PER_ELEMENT);
    return lenBuf8 != null ? await this.readUint8s(buf32Int(lenBuf8)) : null;
  }

  private async readUint8s(length: number): Promise<Uint8Array | null> {
    if (this.pos + length <= this.buffer.length) {
      return this.buffer.subarray(this.pos, this.pos += length);
    } else {
      const buffer = new Uint8Array(length);
      for (let i = 0; i < length; i++) {
        if (this.pos >= this.buffer.length) {
          const { value } = await this.reader.read();
          if (value == null)
            return null;
          this.buffer = value;
          this.pos = 0;
        }
        buffer[i] = this.buffer[this.pos++];
      }
      return buffer;
    }
  }
}
