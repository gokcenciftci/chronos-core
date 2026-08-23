import { type TimeSeriesEvent } from "../core/types.js";

export type EventSubscriber = (event: TimeSeriesEvent) => void | Promise<void>;

export class EventTopicManager {
  private readonly _subscribers: Map<string, Set<EventSubscriber>> = new Map();
  private readonly _wildcardSubscribers: Set<EventSubscriber> = new Set();

  public subscribe(metric: string, subscriber: EventSubscriber): () => void {
    if (metric === "*") {
      this._wildcardSubscribers.add(subscriber);
      return () => {
        this._wildcardSubscribers.delete(subscriber);
      };
    }

    let set = this._subscribers.get(metric);
    if (!set) {
      set = new Set();
      this._subscribers.set(metric, set);
    }
    set.add(subscriber);

    return () => {
      set?.delete(subscriber);
      if (set?.size === 0) {
        this._subscribers.delete(metric);
      }
    };
  }

  public publish(event: TimeSeriesEvent): void {

    const specific = this._subscribers.get(event.metric);
    if (specific && specific.size > 0) {
      for (const sub of specific) {
        try {
          void sub(event);
        } catch (err) {
          console.error(`[EventTopicManager] Subscriber error for '${event.metric}':`, err);
        }
      }
    }

    if (this._wildcardSubscribers.size > 0) {
      for (const sub of this._wildcardSubscribers) {
        try {
          void sub(event);
        } catch (err) {
          console.error("[EventTopicManager] Wildcard subscriber error:", err);
        }
      }
    }
  }

  public clear(): void {
    this._subscribers.clear();
    this._wildcardSubscribers.clear();
  }
}
