import fs from "node:fs";
import path from "node:path";
import { type TimeSeriesEvent } from "../core/types.js";
import { BinaryCodec } from "./binary-codec.js";
import { WALSegment } from "./wal-segment.js";

export interface WALManagerOptions {
  readonly directory: string;
  readonly maxSegmentSizeBytes?: number | undefined;
  readonly syncMode?: "SYNC" | "ASYNC_BATCH" | undefined;
}

export class WALManager {
  public readonly directory: string;
  public readonly maxSegmentSizeBytes: number;
  public readonly syncMode: "SYNC" | "ASYNC_BATCH";

  private _currentSegment: WALSegment | null = null;
  private _segmentIndex: number = 0;
  private _totalSegmentsCount: number = 0;

  constructor(options: WALManagerOptions) {
    this.directory = options.directory;
    this.maxSegmentSizeBytes = options.maxSegmentSizeBytes ?? 10 * 1024 * 1024;
    this.syncMode = options.syncMode ?? "ASYNC_BATCH";

    if (!fs.existsSync(this.directory)) {
      fs.mkdirSync(this.directory, { recursive: true });
    }
  }

  public get currentSegment(): WALSegment | null {
    return this._currentSegment;
  }

  public get segmentCount(): number {
    return this._totalSegmentsCount;
  }

  public get totalDiskBytes(): number {
    if (!fs.existsSync(this.directory)) return 0;
    const files = fs.readdirSync(this.directory).filter((f) => f.endsWith(".wal"));
    let total = 0;
    for (const f of files) {
      total += fs.statSync(path.join(this.directory, f)).size;
    }
    return total;
  }

  public write(event: TimeSeriesEvent): void {
    const encoded = BinaryCodec.encodeEvent(event);

    if (this._currentSegment === null || this._currentSegment.sizeBytes + encoded.length > this.maxSegmentSizeBytes) {
      this.rotateSegment();
    }

    this._currentSegment!.append(encoded);

    if (this.syncMode === "SYNC") {
      this._currentSegment!.sync();
    }
  }

  public writeBatch(events: readonly TimeSeriesEvent[]): void {
    for (const event of events) {
      this.write(event);
    }
    if (this.syncMode === "ASYNC_BATCH" && this._currentSegment) {
      this._currentSegment.sync();
    }
  }

  public recover(): TimeSeriesEvent[] {
    const files = fs.readdirSync(this.directory)
      .filter((f) => f.endsWith(".wal"))
      .sort((a, b) => {
        const idxA = parseInt(a.replace(/[^0-9]/g, ""), 10) || 0;
        const idxB = parseInt(b.replace(/[^0-9]/g, ""), 10) || 0;
        return idxA - idxB;
      });

    this._totalSegmentsCount = files.length;
    const allEvents: TimeSeriesEvent[] = [];

    for (const file of files) {
      const filePath = path.join(this.directory, file);
      const segmentIndex = parseInt(file.replace(/[^0-9]/g, ""), 10) || 0;
      const segment = new WALSegment(filePath, segmentIndex);
      const events = segment.readAll();
      allEvents.push(...events);

      this._segmentIndex = Math.max(this._segmentIndex, segmentIndex);
    }

    if (files.length > 0) {
      const lastFile = files[files.length - 1]!;
      const lastPath = path.join(this.directory, lastFile);
      this._currentSegment = new WALSegment(lastPath, this._segmentIndex);
      this._currentSegment.open();
    }

    return allEvents;
  }

  public close(): void {
    if (this._currentSegment) {
      this._currentSegment.sync();
      this._currentSegment.close();
      this._currentSegment = null;
    }
  }

  private rotateSegment(): void {
    if (this._currentSegment) {
      this._currentSegment.sync();
      this._currentSegment.close();
    }

    this._segmentIndex += 1;
    this._totalSegmentsCount += 1;
    const paddedIndex = String(this._segmentIndex).padStart(5, "0");
    const fileName = `segment_${paddedIndex}.wal`;
    const filePath = path.join(this.directory, fileName);

    this._currentSegment = new WALSegment(filePath, this._segmentIndex);
    this._currentSegment.open();
  }
}
