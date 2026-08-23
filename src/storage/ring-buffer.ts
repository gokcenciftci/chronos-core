export class CircularRingBuffer<T> {
  private readonly _buffer: Array<T | undefined>;
  private readonly _capacity: number;
  private _head = 0;
  private _size = 0;

  constructor(capacity: number) {
    this._capacity = Math.max(1, capacity);
    this._buffer = new Array<T | undefined>(this._capacity);
  }

  public get capacity(): number {
    return this._capacity;
  }

  public get size(): number {
    return this._size;
  }

  public push(item: T): void {
    this._buffer[this._head] = item;
    this._head = (this._head + 1) % this._capacity;
    if (this._size < this._capacity) {
      this._size += 1;
    }
  }

  public pushBatch(items: readonly T[]): void {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item !== undefined) {
        this.push(item);
      }
    }
  }

  public last(): T | undefined {
    if (this._size === 0) return undefined;
    const lastIndex = (this._head - 1 + this._capacity) % this._capacity;
    return this._buffer[lastIndex];
  }

  public toArray(): T[] {
    if (this._size === 0) return [];

    const result: T[] = new Array<T>(this._size);
    const start = this._size < this._capacity ? 0 : this._head;

    for (let i = 0; i < this._size; i++) {
      const index = (start + i) % this._capacity;
      const item = this._buffer[index];
      if (item !== undefined) {
        result[i] = item;
      }
    }

    return result;
  }

  public clear(): void {
    this._buffer.fill(undefined);
    this._head = 0;
    this._size = 0;
  }
}
