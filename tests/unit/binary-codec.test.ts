import { describe, it, expect } from "vitest";
import { type TimeSeriesEvent } from "../../src/core/types.js";
import { BinaryCodec } from "../../src/storage/binary-codec.js";

describe("BinaryCodec", () => {
  it("should encode and decode TimeSeriesEvent losslessly", () => {
    const event: TimeSeriesEvent = {
      metric: "cpu_usage",
      timestamp: 1724428800000,
      value: 78.452,
      tags: { host: "server-01", env: "prod" },
    };

    const encoded = BinaryCodec.encodeEvent(event);
    expect(encoded.length).toBeGreaterThan(20);

    const { event: decoded, bytesRead } = BinaryCodec.decodeEvent(encoded, 0);
    expect(bytesRead).toBe(encoded.length);
    expect(decoded.metric).toBe(event.metric);
    expect(decoded.timestamp).toBe(event.timestamp);
    expect(decoded.value).toBeCloseTo(event.value, 4);
    expect(decoded.tags).toEqual(event.tags);
  });

  it("should encode and decode event without tags", () => {
    const event: TimeSeriesEvent = {
      metric: "memory_mb",
      timestamp: 1724428800500,
      value: 1024.5,
    };

    const encoded = BinaryCodec.encodeEvent(event);
    const { event: decoded } = BinaryCodec.decodeEvent(encoded);

    expect(decoded.metric).toBe("memory_mb");
    expect(decoded.value).toBe(1024.5);
    expect(decoded.tags).toBeUndefined();
  });

  it("should detect corrupted checksum and throw error", () => {
    const event: TimeSeriesEvent = {
      metric: "latency_ms",
      timestamp: 1724428800000,
      value: 12.34,
    };

    const encoded = BinaryCodec.encodeEvent(event);

    encoded[5] = (encoded[5] ?? 0) ^ 0xff;

    expect(() => BinaryCodec.decodeEvent(encoded)).toThrow("Checksum mismatch");
  });

  it("should throw on invalid magic byte", () => {
    const buf = Buffer.alloc(30);
    buf[0] = 0x00;

    expect(() => BinaryCodec.decodeEvent(buf)).toThrow("Invalid Chronos magic byte");
  });
});
