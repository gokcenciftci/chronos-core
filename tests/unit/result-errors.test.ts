import { describe, it, expect } from "vitest";
import {
  WALCorruptedError,
  SegmentFullError,
  QueryExecutionError,
  InvalidTimeRangeError,
  MetricNotFoundError,
} from "../../src/core/errors.js";
import { ok, err, isOk, isErr, map, mapErr, flatMap, unwrapOr, match } from "../../src/core/result.js";

describe("Result Monad & Domain Errors", () => {
  it("should handle Result monad operations", () => {
    const r1 = ok(10);
    expect(isOk(r1)).toBe(true);
    expect(isErr(r1)).toBe(false);
    expect(unwrapOr(r1, 0)).toBe(10);

    const r2 = map(r1, (x) => x * 2);
    expect(unwrapOr(r2, 0)).toBe(20);

    const rErr = err("error occurred");
    expect(isErr(rErr)).toBe(true);
    expect(unwrapOr(rErr, 99)).toBe(99);

    const mappedErr = mapErr(rErr, (e) => `Wrapped: ${e}`);
    expect(match(mappedErr, { onOk: (v) => String(v), onErr: (e) => e })).toBe("Wrapped: error occurred");

    const flatMapped = flatMap(r1, (v) => ok(v + 5));
    expect(unwrapOr(flatMapped, 0)).toBe(15);
  });

  it("should instantiate all typed errors correctly", () => {
    const walErr = new WALCorruptedError("seg.wal", 128, "CRC fail");
    expect(walErr.code).toBe("WAL_CORRUPTED");
    expect(walErr.offset).toBe(128);

    const segFull = new SegmentFullError(1000, 1000);
    expect(segFull.code).toBe("SEGMENT_FULL");

    const qErr = new QueryExecutionError("cpu", "failed");
    expect(qErr.code).toBe("QUERY_EXECUTION_FAILED");

    const trErr = new InvalidTimeRangeError(100, 50);
    expect(trErr.code).toBe("INVALID_TIME_RANGE");

    const mnf = new MetricNotFoundError("missing");
    expect(mnf.code).toBe("METRIC_NOT_FOUND");
  });
});
