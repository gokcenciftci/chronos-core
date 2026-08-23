import { type TimeSeriesEvent } from "../core/types.js";

export class EventFilter {
  public static matches(
    event: TimeSeriesEvent,
    tags?: Readonly<Record<string, string>> | undefined
  ): boolean {
    if (!tags || Object.keys(tags).length === 0) return true;
    if (!event.tags) return false;

    for (const [key, value] of Object.entries(tags)) {
      if (event.tags[key] !== value) {
        return false;
      }
    }

    return true;
  }
}
