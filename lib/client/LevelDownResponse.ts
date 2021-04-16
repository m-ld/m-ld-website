import { AbstractLevelDOWN } from 'abstract-leveldown';

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
    backend: AbstractLevelDOWN<Uint8Array, Uint8Array>, response: Response) {
    if (response.body != null) {
      const reading = new LevelDownResponse(response.body.getReader());
      while (true) {
        const [key, value] = await reading.read();
        if (key != null && value != null)
          await new Promise((resolve, reject) => backend.put(
            // Must convert to Buffer because memdown detects Buffer._isBuffer
            Buffer.from(key), Buffer.from(value),
            err => err ? reject(err) : resolve(null)));
        else
          break;
      }
    }
  }

  static readFrom(
    backend: AbstractLevelDOWN<Uint8Array, Uint8Array>): Response {
    const iterator = backend.iterator();
    const stream = new ReadableStream({
      async pull(controller) {
        iterator.next((err, key, value) => {
          if (err) {
            controller.error(err);
          } else if (key == null || value == null) {
            controller.close();
          } else {
            controller.enqueue(new Uint8Array([
              ...int32Buf(key.length), ...key,
              ...int32Buf(value.length), ...value
            ]));
          }
        });
      }
    });
    const headers = new Headers({ 'Content-Type': 'application/octet-stream' });
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
