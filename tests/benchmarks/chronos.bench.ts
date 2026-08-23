import { bench, describe } from "vitest";
import { type TimeSeriesEvent } from "../../src/core/types.js";
import { computeAggregates } from "../../src/query/aggregates.js";
import { BinaryCodec } from "../../src/storage/binary-codec.js";
import { CircularRingBuffer } from "../../src/storage/ring-buffer.js";
import { TimeSkipList } from "../../src/storage/skiplist.js";

describe("ChronosCore Performance Benchmarks", () => {
  const skipList = new TimeSkipList();
  let ts = 1000;
  bench("TimeSkipList In-Memory Insert", () => {
    skipList.insert(ts++, 42.5);
  });

  const event: TimeSeriesEvent = {
    metric: "cpu_usage_pct",
    timestamp: 1724428800000,
    value: 85.34,
    tags: { host: "srv-01", region: "eu-central" },
  };

  bench("BinaryCodec Event Serialization", () => {
    BinaryCodec.encodeEvent(event);
  });

  const ringBuffer = new CircularRingBuffer<number>(10_000);
  let counter = 0;
  bench("Circular RingBuffer Zero-Alloc Push", () => {
    ringBuffer.push(counter++);
  });

  const sampleValues = Array.from({ length: 1000 }, (_, i) => i * 1.5);
  bench("Streaming Aggregates Calculation (1,000 pts)", () => {
    computeAggregates(sampleValues, 10);
  });
});
