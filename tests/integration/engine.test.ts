import { describe, it, expect } from "vitest";
import { isOk, isErr } from "../../src/core/result.js";
import { ChronosCore } from "../../src/engine.js";

describe("ChronosCore Integration", () => {
  it("should ingest metrics and perform range and aggregate queries", () => {
    const engine = new ChronosCore();
    const baseTime = 1000;

    for (let i = 0; i < 10; i++) {
      engine.insert("memory_usage", (i + 1) * 10, baseTime + i * 100, { host: "h1" });
    }

    const queryRes = engine.query({
      metric: "memory_usage",
      range: { start: baseTime, end: baseTime + 1000 },
      aggregates: ["mean", "min", "max", "sum", "p50", "p95"],
    });

    expect(isOk(queryRes)).toBe(true);
    if (isOk(queryRes)) {
      expect(queryRes.value.totalPoints).toBe(10);
      expect(queryRes.value.summary?.min).toBe(10);
      expect(queryRes.value.summary?.max).toBe(100);
      expect(queryRes.value.summary?.sum).toBe(550);
      expect(queryRes.value.summary?.mean).toBe(55);
    }

    const windowRes = engine.query({
      metric: "memory_usage",
      range: { start: baseTime, end: baseTime + 1000 },
      window: { sizeMs: 500 },
      aggregates: ["mean"],
    });

    expect(isOk(windowRes)).toBe(true);
    if (isOk(windowRes)) {
      expect(windowRes.value.buckets?.length).toBe(2);
      expect(windowRes.value.buckets?.[0]?.count).toBe(5);
    }

    const missingRes = engine.query({
      metric: "unknown",
      range: { start: 0, end: 100 },
    });
    expect(isErr(missingRes)).toBe(true);

    const stats = engine.getStats();
    expect(stats.totalEvents).toBe(10);
    expect(stats.activeMetricsCount).toBe(1);

    engine.close();
  });

  it("should handle batch insertion and recent events retrieval", () => {
    const engine = new ChronosCore({ ringBufferCapacity: 10 });
    const batch = Array.from({ length: 5 }, (_, i) => ({
      metric: "disk_io",
      timestamp: 100 + i,
      value: i * 5,
    }));

    const res = engine.insertBatch(batch);
    expect(isOk(res)).toBe(true);

    const recent = engine.getRecentEvents();
    expect(recent.length).toBe(5);
    expect(recent[0]?.metric).toBe("disk_io");

    engine.close();
  });
});
