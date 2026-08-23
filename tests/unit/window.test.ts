import { describe, it, expect } from "vitest";
import { type DataPoint } from "../../src/core/types.js";
import { WindowBucketer } from "../../src/query/window.js";

describe("WindowBucketer", () => {
  it("should bucket points into tumbling windows", () => {
    const points: DataPoint[] = [
      { timestamp: 1000, value: 10 },
      { timestamp: 2000, value: 20 },
      { timestamp: 6000, value: 30 },
      { timestamp: 8000, value: 40 },
    ];

    const buckets = WindowBucketer.bucketize(points, { sizeMs: 5000 }, 0, 10000);

    expect(buckets.length).toBe(2);
    expect(buckets[0]?.count).toBe(2);
    expect(buckets[0]?.aggregates.mean).toBe(15);

    expect(buckets[1]?.count).toBe(2);
    expect(buckets[1]?.aggregates.mean).toBe(35);
  });

  it("should handle sliding window with custom slideMs", () => {
    const points: DataPoint[] = [
      { timestamp: 1000, value: 10 },
      { timestamp: 3000, value: 20 },
      { timestamp: 5000, value: 30 },
    ];

    const buckets = WindowBucketer.bucketize(points, { sizeMs: 4000, slideMs: 2000 }, 0, 6000);
    expect(buckets.length).toBeGreaterThan(1);
  });

  it("should return empty array for empty points", () => {
    expect(WindowBucketer.bucketize([], { sizeMs: 1000 }, 0, 5000)).toEqual([]);
  });
});
