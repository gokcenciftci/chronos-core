#!/usr/bin/env node
import { ChronosCore } from "./engine.js";
import { isOk } from "./core/result.js";

async function main() {
  console.log("\n\x1b[1m\x1b[35m=====================================================");
  console.log(" ⚡ ChronosCore Time-Series & Event Stream Engine ⚡");
  console.log("=====================================================\x1b[0m\n");

  const engine = new ChronosCore({
    ringBufferCapacity: 50_000,
  });

  engine.subscribe("cpu_usage_pct", () => {

  });

  console.log("🚀 \x1b[1mBenchmarking Ingestion of 100,000 Time-Series Events...\x1b[0m");

  const startIngest = performance.now();
  const baseTime = Date.now() - 60_000;

  for (let i = 0; i < 100_000; i++) {
    const timestamp = baseTime + Math.floor((i / 100_000) * 60_000);
    const value = 20 + Math.sin(i / 100) * 15 + Math.random() * 5;
    engine.insert("cpu_usage_pct", value, timestamp, { host: `srv-0${(i % 5) + 1}`, region: "eu-central" });
  }

  const durationMs = performance.now() - startIngest;
  const opsPerSec = Math.round((100_000 / durationMs) * 1000);

  console.log(`\x1b[32m✔ Ingested 100,000 events in ${durationMs.toFixed(2)}ms (${opsPerSec.toLocaleString()} writes/sec)\x1b[0m\n`);

  console.log("🔍 \x1b[1mExecuting 10-Second Tumbling Window Aggregation Query...\x1b[0m");

  const queryResult = engine.query({
    metric: "cpu_usage_pct",
    range: { start: baseTime, end: baseTime + 60_000 },
    window: { sizeMs: 10_000 },
    aggregates: ["mean", "min", "max", "p50", "p95", "p99", "rate"],
  });

  if (isOk(queryResult)) {
    const res = queryResult.value;
    console.log(`\x1b[32m✔ Query executed in ${res.executionTimeMs}ms (${res.totalPoints.toLocaleString()} points scanned)\x1b[0m\n`);

    console.log("\x1b[1mAggregated 10-Second Time Windows:\x1b[0m");
    const tableData = res.buckets?.map((b, idx) => ({
      window: `Window ${idx + 1}`,
      points: b.count,
      mean: `${b.aggregates.mean.toFixed(2)}%`,
      min: `${b.aggregates.min.toFixed(2)}%`,
      max: `${b.aggregates.max.toFixed(2)}%`,
      p95: `${b.aggregates.p95.toFixed(2)}%`,
      p99: `${b.aggregates.p99.toFixed(2)}%`,
    }));
    console.table(tableData);

    console.log("\n\x1b[1mStorage Engine Statistics:\x1b[0m");
    console.table(engine.getStats());
  } else {
    console.error("Query Error:", queryResult.error.message);
  }

  engine.close();
}

void main();
