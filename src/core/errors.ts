export abstract class ChronosError extends Error {
  public abstract readonly code: string;
  public readonly timestamp: number;
  public override readonly cause?: unknown | undefined;

  constructor(message: string, cause?: unknown | undefined) {
    super(message);
    this.name = this.constructor.name;
    this.timestamp = Date.now();
    this.cause = cause;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class WALCorruptedError extends ChronosError {
  public readonly code = "WAL_CORRUPTED" as const;
  public readonly segmentPath: string;
  public readonly offset: number;

  constructor(segmentPath: string, offset: number, reason: string) {
    super(`WAL segment '${segmentPath}' is corrupted at offset ${offset}: ${reason}`);
    this.segmentPath = segmentPath;
    this.offset = offset;
  }
}

export class SegmentFullError extends ChronosError {
  public readonly code = "SEGMENT_FULL" as const;
  public readonly currentBytes: number;
  public readonly maxBytes: number;

  constructor(currentBytes: number, maxBytes: number) {
    super(`Segment reached capacity ceiling: ${currentBytes} / ${maxBytes} bytes`);
    this.currentBytes = currentBytes;
    this.maxBytes = maxBytes;
  }
}

export class QueryExecutionError extends ChronosError {
  public readonly code = "QUERY_EXECUTION_FAILED" as const;
  public readonly metric: string;

  constructor(metric: string, message: string, cause?: unknown | undefined) {
    super(`Query failed on metric '${metric}': ${message}`, cause);
    this.metric = metric;
  }
}

export class InvalidTimeRangeError extends ChronosError {
  public readonly code = "INVALID_TIME_RANGE" as const;
  public readonly start: number;
  public readonly end: number;

  constructor(start: number, end: number) {
    super(`Invalid query time range: start (${start}) must be <= end (${end})`);
    this.start = start;
    this.end = end;
  }
}

export class MetricNotFoundError extends ChronosError {
  public readonly code = "METRIC_NOT_FOUND" as const;
  public readonly metric: string;

  constructor(metric: string) {
    super(`Metric series '${metric}' does not exist in storage index`);
    this.metric = metric;
  }
}
