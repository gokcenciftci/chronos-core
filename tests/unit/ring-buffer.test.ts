import { describe, it, expect } from "vitest";
import { CircularRingBuffer } from "../../src/storage/ring-buffer.js";

describe("CircularRingBuffer", () => {
  it("should push items and retain capacity", () => {
    const ring = new CircularRingBuffer<number>(3);
    expect(ring.capacity).toBe(3);
    expect(ring.size).toBe(0);

    ring.push(10);
    ring.push(20);
    expect(ring.size).toBe(2);
    expect(ring.last()).toBe(20);
    expect(ring.toArray()).toEqual([10, 20]);
  });

  it("should overwrite oldest items upon exceeding capacity", () => {
    const ring = new CircularRingBuffer<string>(3);
    ring.push("A");
    ring.push("B");
    ring.push("C");
    ring.push("D");

    expect(ring.size).toBe(3);
    expect(ring.last()).toBe("D");
    expect(ring.toArray()).toEqual(["B", "C", "D"]);
  });

  it("should push batch items correctly", () => {
    const ring = new CircularRingBuffer<number>(5);
    ring.pushBatch([1, 2, 3, 4, 5, 6]);

    expect(ring.size).toBe(5);
    expect(ring.toArray()).toEqual([2, 3, 4, 5, 6]);
  });

  it("should clear items cleanly", () => {
    const ring = new CircularRingBuffer<number>(5);
    ring.push(1);
    ring.clear();

    expect(ring.size).toBe(0);
    expect(ring.last()).toBeUndefined();
    expect(ring.toArray()).toEqual([]);
  });
});
