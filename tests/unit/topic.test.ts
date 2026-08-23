import { describe, it, expect, vi } from "vitest";
import { type TimeSeriesEvent } from "../../src/core/types.js";
import { EventTopicManager } from "../../src/stream/topic.js";

describe("EventTopicManager", () => {
  it("should dispatch events to metric-specific subscribers", () => {
    const manager = new EventTopicManager();
    const fn1 = vi.fn();
    const fn2 = vi.fn();

    const unsub1 = manager.subscribe("cpu", fn1);
    manager.subscribe("mem", fn2);

    const event: TimeSeriesEvent = { metric: "cpu", timestamp: 100, value: 50 };
    manager.publish(event);

    expect(fn1).toHaveBeenCalledWith(event);
    expect(fn2).not.toHaveBeenCalled();

    unsub1();
    manager.publish(event);
    expect(fn1).toHaveBeenCalledTimes(1);
  });

  it("should dispatch to wildcard subscribers", () => {
    const manager = new EventTopicManager();
    const wildcardFn = vi.fn();

    const unsubWild = manager.subscribe("*", wildcardFn);

    manager.publish({ metric: "cpu", timestamp: 1, value: 10 });
    manager.publish({ metric: "disk", timestamp: 2, value: 20 });

    expect(wildcardFn).toHaveBeenCalledTimes(2);

    unsubWild();
    manager.publish({ metric: "cpu", timestamp: 3, value: 30 });
    expect(wildcardFn).toHaveBeenCalledTimes(2);
  });
});
