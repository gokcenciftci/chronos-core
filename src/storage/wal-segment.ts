import fs from "node:fs";
import { WALCorruptedError } from "../core/errors.js";
import { type TimeSeriesEvent } from "../core/types.js";
import { BinaryCodec } from "./binary-codec.js";

export class WALSegment {
  public readonly filePath: string;
  public readonly segmentIndex: number;
  private _fd: number | null = null;
  private _sizeBytes: number = 0;

  constructor(filePath: string, segmentIndex: number) {
    this.filePath = filePath;
    this.segmentIndex = segmentIndex;

    if (fs.existsSync(filePath)) {
      this._sizeBytes = fs.statSync(filePath).size;
    }
  }

  public get sizeBytes(): number {
    return this._sizeBytes;
  }

  public open(): void {
    if (this._fd === null) {
      this._fd = fs.openSync(this.filePath, "a+");
      this._sizeBytes = fs.fstatSync(this._fd).size;
    }
  }

  public append(eventBuffer: Buffer): number {
    this.open();
    if (this._fd === null) throw new Error("WAL Segment file descriptor not open");

    const written = fs.writeSync(this._fd, eventBuffer, 0, eventBuffer.length);
    this._sizeBytes += written;
    return written;
  }

  public sync(): void {
    if (this._fd !== null) {
      fs.fsyncSync(this._fd);
    }
  }

  public readAll(): TimeSeriesEvent[] {
    if (!fs.existsSync(this.filePath)) return [];

    const fileBuffer = fs.readFileSync(this.filePath);
    const events: TimeSeriesEvent[] = [];
    let offset = 0;

    while (offset < fileBuffer.length) {
      try {
        const { event, bytesRead } = BinaryCodec.decodeEvent(fileBuffer, offset);
        events.push(event);
        offset += bytesRead;
      } catch (err) {
        throw new WALCorruptedError(
          this.filePath,
          offset,
          err instanceof Error ? err.message : String(err)
        );
      }
    }

    return events;
  }

  public close(): void {
    if (this._fd !== null) {
      fs.closeSync(this._fd);
      this._fd = null;
    }
  }
}
