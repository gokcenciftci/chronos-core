export interface DataPoint {
  readonly timestamp: number;
  readonly value: number;
}

export interface TimeSeriesEvent {
  readonly metric: string;
  readonly timestamp: number;
  readonly value: number;
  readonly tags?: Readonly<Record<string, string>> | undefined;
}

export interface TimeRange {
  readonly start: number;
  readonly end: number;
}

export type AggregateType =
  | "count"
  | "sum"
  | "mean"
  | "min"
  | "max"
  | "stddev"
  | "p50"
  | "p90"
  | "p95"
  | "p99"
  | "rate";

export interface WindowSpec {
  readonly sizeMs: number;
  readonly slideMs?: number | undefined;
}

export interface WindowBucket {
  readonly start: number;
  readonly end: number;
  readonly count: number;
  readonly aggregates: Readonly<Record<AggregateType, number>>;
}

export interface QuerySpec {
  readonly metric: string;
  readonly range: TimeRange;
  readonly tags?: Readonly<Record<string, string>> | undefined;
  readonly window?: WindowSpec | undefined;
  readonly aggregates?: readonly AggregateType[] | undefined;
}

export interface QueryResult {
  readonly metric: string;
  readonly totalPoints: number;
  readonly executionTimeMs: number;
  readonly points?: readonly DataPoint[] | undefined;
  readonly buckets?: readonly WindowBucket[] | undefined;
  readonly summary?: Readonly<Record<AggregateType, number>> | undefined;
}

export interface StorageStats {
  readonly totalEvents: number;
  readonly memoryBytes: number;
  readonly activeMetricsCount: number;
  readonly walSegmentsCount: number;
  readonly walDiskSizeBytes: number;
  readonly writeThroughputOpsPerSec: number;
}

export interface EngineConfig {
  readonly dataDirectory?: string | undefined;
  readonly enableWal?: boolean | undefined;
  readonly walSyncMode?: "SYNC" | "ASYNC_BATCH" | undefined;
  readonly walMaxSegmentBytes?: number | undefined;
  readonly maxMemoryEventsPerMetric?: number | undefined;
  readonly ringBufferCapacity?: number | undefined;
}
