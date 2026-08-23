import { InvalidTimeRangeError } from "../core/errors.js";
import { type QueryResult, type QuerySpec } from "../core/types.js";
import { type TimeSkipList } from "../storage/skiplist.js";
import { computeAggregates } from "./aggregates.js";
import { WindowBucketer } from "./window.js";

export class QueryEngine {
  public static execute(spec: QuerySpec, index: TimeSkipList): QueryResult {
    const startTime = performance.now();

    if (spec.range.start > spec.range.end) {
      throw new InvalidTimeRangeError(spec.range.start, spec.range.end);
    }

    let points: { timestamp: number; value: number }[];
    if (spec.tags && Object.keys(spec.tags).length > 0) {
      const events = index.rangeEvents(spec.metric, spec.range.start, spec.range.end, spec.tags);
      points = events.map((e) => ({ timestamp: e.timestamp, value: e.value }));
    } else {
      points = index.range(spec.range.start, spec.range.end);
    }

    const timeSpanSec = (spec.range.end - spec.range.start) / 1000;
    const values = points.map((p) => p.value);
    const summary = spec.aggregates && spec.aggregates.length > 0 ? computeAggregates(values, timeSpanSec) : undefined;

    const buckets = spec.window
      ? WindowBucketer.bucketize(points, spec.window, spec.range.start, spec.range.end)
      : undefined;

    const executionTimeMs = Number((performance.now() - startTime).toFixed(3));

    return {
      metric: spec.metric,
      totalPoints: points.length,
      executionTimeMs,
      points: spec.window ? undefined : points,
      buckets,
      summary,
    };
  }
}
