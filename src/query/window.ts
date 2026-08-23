import { type DataPoint, type WindowBucket, type WindowSpec } from "../core/types.js";
import { computeAggregates } from "./aggregates.js";

export class WindowBucketer {
  public static bucketize(
    points: readonly DataPoint[],
    window: WindowSpec,
    rangeStart: number,
    rangeEnd: number
  ): WindowBucket[] {
    if (points.length === 0 || window.sizeMs <= 0) return [];

    const slideMs = window.slideMs ?? window.sizeMs;
    const buckets: WindowBucket[] = [];

    let currentStart = rangeStart;
    while (currentStart < rangeEnd) {
      const currentEnd = currentStart + window.sizeMs;

      const bucketValues: number[] = [];
      for (let i = 0; i < points.length; i++) {
        const p = points[i]!;
        if (p.timestamp >= currentStart && p.timestamp < currentEnd) {
          bucketValues.push(p.value);
        }
      }

      if (bucketValues.length > 0) {
        const timeSpanSec = (currentEnd - currentStart) / 1000;
        buckets.push({
          start: currentStart,
          end: currentEnd,
          count: bucketValues.length,
          aggregates: computeAggregates(bucketValues, timeSpanSec),
        });
      }

      currentStart += slideMs;
    }

    return buckets;
  }
}
