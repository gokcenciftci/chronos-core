import { ChronosError, MetricNotFoundError } from "./core/errors.js";
import { type Result, ok, err } from "./core/result.js";
import {
  type EngineConfig,
  type QueryResult,
  type QuerySpec,
  type StorageStats,
  type TimeSeriesEvent,
} from "./core/types.js";
import { QueryEngine } from "./query/engine.js";
import { CircularRingBuffer } from "./storage/ring-buffer.js";
import { TimeSkipList } from "./storage/skiplist.js";
import { WALManager } from "./storage/wal-manager.js";
import { type EventSubscriber, EventTopicManager } from "./stream/topic.js";

export class ChronosCore {
  private readonly _indexes: Map<string, TimeSkipList> = new Map();
  private readonly _ringBuffer: CircularRingBuffer<TimeSeriesEvent>;
  private readonly _topics: EventTopicManager;
  private readonly _walManager?: WALManager | undefined;
  private _totalIngestedEvents: number = 0;
  private readonly _startTime: number;

  constructor(config?: EngineConfig | undefined) {
    this._startTime = Date.now();
    this._ringBuffer = new CircularRingBuffer<TimeSeriesEvent>(config?.ringBufferCapacity ?? 100_000);
    this._topics = new EventTopicManager();

    if (config?.enableWal !== false && config?.dataDirectory) {
      this._walManager = new WALManager({
        directory: config.dataDirectory,
        maxSegmentSizeBytes: config.walMaxSegmentBytes,
        syncMode: config.walSyncMode,
      });

      this.recoverFromWAL();
    }
  }

  public insert(
    metric: string,
    value: number,
    timestamp: number = Date.now(),
    tags?: Readonly<Record<string, string>> | undefined
  ): Result<void, ChronosError> {
    try {
      const event: TimeSeriesEvent = {
        metric,
        value,
        timestamp,
        tags,
      };

      let index = this._indexes.get(metric);
      if (!index) {
        index = new TimeSkipList();
        this._indexes.set(metric, index);
      }
      index.insert(timestamp, value, tags);

      this._ringBuffer.push(event);

      if (this._walManager) {
        this._walManager.write(event);
      }

      this._topics.publish(event);

      this._totalIngestedEvents += 1;
      return ok(undefined);
    } catch (error) {
      return err(
        error instanceof ChronosError ? error : new (class extends ChronosError { readonly code = "INSERT_FAILED" })(String(error))
      );
    }
  }

  public insertBatch(events: readonly TimeSeriesEvent[]): Result<number, ChronosError> {
    try {
      for (let i = 0; i < events.length; i++) {
        const ev = events[i]!;
        let index = this._indexes.get(ev.metric);
        if (!index) {
          index = new TimeSkipList();
          this._indexes.set(ev.metric, index);
        }
        index.insert(ev.timestamp, ev.value, ev.tags);
        this._ringBuffer.push(ev);
        this._topics.publish(ev);
      }

      if (this._walManager) {
        this._walManager.writeBatch(events);
      }

      this._totalIngestedEvents += events.length;
      return ok(events.length);
    } catch (error) {
      return err(
        error instanceof ChronosError ? error : new (class extends ChronosError { readonly code = "BATCH_INSERT_FAILED" })(String(error))
      );
    }
  }

  public query(spec: QuerySpec): Result<QueryResult, ChronosError> {
    try {
      const index = this._indexes.get(spec.metric);
      if (!index) {
        throw new MetricNotFoundError(spec.metric);
      }

      const result = QueryEngine.execute(spec, index);
      return ok(result);
    } catch (error) {
      return err(
        error instanceof ChronosError ? error : new (class extends ChronosError { readonly code = "QUERY_FAILED" })(String(error))
      );
    }
  }

  public subscribe(metric: string, subscriber: EventSubscriber): () => void {
    return this._topics.subscribe(metric, subscriber);
  }

  public getRecentEvents(): TimeSeriesEvent[] {
    return this._ringBuffer.toArray();
  }

  public getStats(): StorageStats {
    const elapsedSec = Math.max(1, (Date.now() - this._startTime) / 1000);
    const throughput = Number((this._totalIngestedEvents / elapsedSec).toFixed(2));

    const memoryBytes = this._totalIngestedEvents * 64 + this._indexes.size * 1024;

    return {
      totalEvents: this._totalIngestedEvents,
      memoryBytes,
      activeMetricsCount: this._indexes.size,
      walSegmentsCount: this._walManager ? this._walManager.segmentCount : 0,
      walDiskSizeBytes: this._walManager ? this._walManager.totalDiskBytes : 0,
      writeThroughputOpsPerSec: throughput,
    };
  }

  public close(): void {
    if (this._walManager) {
      this._walManager.close();
    }
    this._topics.clear();
  }

  private recoverFromWAL(): void {
    if (!this._walManager) return;

    const events = this._walManager.recover();
    for (let i = 0; i < events.length; i++) {
      const ev = events[i]!;
      let index = this._indexes.get(ev.metric);
      if (!index) {
        index = new TimeSkipList();
        this._indexes.set(ev.metric, index);
      }
      index.insert(ev.timestamp, ev.value, ev.tags);
      this._ringBuffer.push(ev);
    }
    this._totalIngestedEvents = events.length;
  }
}
