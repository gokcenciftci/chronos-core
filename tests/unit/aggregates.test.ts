import { describe, it, expect } from "vitest";
import { computeAggregates, calculatePercentile, calculateStdDev } from "../../src/query/aggregates.js";

describe("Statistical Aggregates", () => {
  it("should compute aggregates for empty array", () => {
    const agg = computeAggregates([]);
    expect(agg.count).toBe(0);
    expect(agg.mean).toBe(0);
    expect(agg.sum).toBe(0);
  });

  it("should compute statistical aggregations correctly", () => {
    const values = [10, 20, 30, 40, 50];
    const agg = computeAggregates(values, 5);

    expect(agg.count).toBe(5);
    expect(agg.sum).toBe(150);
    expect(agg.mean).toBe(30);
    expect(agg.min).toBe(10);
    expect(agg.max).toBe(50);
    expect(agg.p50).toBe(30);
    expect(agg.p90).toBe(50);
    expect(agg.rate).toBe(1);
  });

  it("should calculate percentile with boundary clamping", () => {
    const sorted = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    expect(calculatePercentile(sorted, 0)).toBe(1);
    expect(calculatePercentile(sorted, 50)).toBe(5);
    expect(calculatePercentile(sorted, 100)).toBe(10);
    expect(calculatePercentile([], 50)).toBe(0);
  });

  it("should calculate stddev for single element and array", () => {
    expect(calculateStdDev([42], 42)).toBe(0);
    const sd = calculateStdDev([10, 20, 30], 20);
    expect(sd).toBeCloseTo(10, 2);
  });
});
