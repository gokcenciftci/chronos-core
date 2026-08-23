import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { isOk } from "../../src/core/result.js";
import { ChronosCore } from "../../src/engine.js";

describe("WAL Durability & Crash Recovery Harness", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "chronos-wal-test-"));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("should persist events to WAL and recover full index upon restart", () => {

    const engine1 = new ChronosCore({
      dataDirectory: tempDir,
      enableWal: true,
      walSyncMode: "SYNC",
      walMaxSegmentBytes: 1024,
    });

    for (let i = 0; i < 50; i++) {
      engine1.insert("req_latency", 20 + i, 1000 + i * 10, { route: "/api/v1" });
    }

    const files = fs.readdirSync(tempDir).filter((f) => f.endsWith(".wal"));
    expect(files.length).toBeGreaterThanOrEqual(1);

    engine1.close();

    const engine2 = new ChronosCore({
      dataDirectory: tempDir,
      enableWal: true,
    });

    const stats = engine2.getStats();
    expect(stats.totalEvents).toBe(50);
    expect(stats.activeMetricsCount).toBe(1);

    const queryRes = engine2.query({
      metric: "req_latency",
      range: { start: 1000, end: 2000 },
      aggregates: ["count", "min", "max", "mean"],
    });

    expect(isOk(queryRes)).toBe(true);
    if (isOk(queryRes)) {
      expect(queryRes.value.totalPoints).toBe(50);
      expect(queryRes.value.summary?.min).toBe(20);
      expect(queryRes.value.summary?.max).toBe(69);
    }

    engine2.close();
  });
});
