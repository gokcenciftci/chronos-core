import { describe, it, expect } from "vitest";
import { TimeSkipList } from "../../src/storage/skiplist.js";

describe("TimeSkipList Index", () => {
  it("should insert points in chronological sorted order and maintain size", () => {
    const list = new TimeSkipList();
    expect(list.size).toBe(0);
    expect(list.minTimestamp).toBeUndefined();

    list.insert(100, 10);
    list.insert(50, 5);
    list.insert(150, 15);

    expect(list.size).toBe(3);
    expect(list.minTimestamp).toBe(50);
    expect(list.maxTimestamp).toBe(150);
  });

  it("should query range scan correctly [start, end]", () => {
    const list = new TimeSkipList();
    for (let t = 10; t <= 100; t += 10) {
      list.insert(t, t * 2);
    }

    const rangePoints = list.range(30, 70);
    expect(rangePoints.length).toBe(5);
    expect(rangePoints[0]?.timestamp).toBe(30);
    expect(rangePoints[0]?.value).toBe(60);
    expect(rangePoints[rangePoints.length - 1]?.timestamp).toBe(70);
  });

  it("should filter by tags during range scan", () => {
    const list = new TimeSkipList();
    list.insert(100, 10, { host: "srv-1", region: "us" });
    list.insert(110, 20, { host: "srv-2", region: "us" });
    list.insert(120, 30, { host: "srv-1", region: "eu" });

    const results = list.rangeEvents("cpu", 90, 130, { host: "srv-1" });
    expect(results.length).toBe(2);
    expect(results[0]?.value).toBe(10);
    expect(results[1]?.value).toBe(30);
  });

  it("should clear the skip list completely", () => {
    const list = new TimeSkipList();
    list.insert(10, 1);
    list.insert(20, 2);
    list.clear();

    expect(list.size).toBe(0);
    expect(list.minTimestamp).toBeUndefined();
    expect(list.range(0, 100).length).toBe(0);
  });
});
