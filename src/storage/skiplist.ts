import { type DataPoint, type TimeSeriesEvent } from "../core/types.js";

const MAX_LEVEL = 16;
const PROBABILITY = 0.5;

interface SkipListNode {
  timestamp: number;
  value: number;
  tags?: Readonly<Record<string, string>> | undefined;
  forward: (SkipListNode | null)[];
}

export class TimeSkipList {
  private readonly _header: SkipListNode;
  private _level: number = 1;
  private _size: number = 0;
  private _minTimestamp: number | undefined;
  private _maxTimestamp: number | undefined;

  constructor() {
    this._header = {
      timestamp: -Infinity,
      value: 0,
      forward: new Array<SkipListNode | null>(MAX_LEVEL).fill(null),
    };
  }

  public get size(): number {
    return this._size;
  }

  public get minTimestamp(): number | undefined {
    return this._minTimestamp;
  }

  public get maxTimestamp(): number | undefined {
    return this._maxTimestamp;
  }

  public insert(timestamp: number, value: number, tags?: Readonly<Record<string, string>> | undefined): void {
    const update: SkipListNode[] = new Array<SkipListNode>(MAX_LEVEL);
    let current: SkipListNode = this._header;

    for (let i = this._level - 1; i >= 0; i--) {
      while (current.forward[i] !== null && current.forward[i] !== undefined && current.forward[i]!.timestamp < timestamp) {
        current = current.forward[i]!;
      }
      update[i] = current;
    }

    const newLevel = this.randomLevel();
    if (newLevel > this._level) {
      for (let i = this._level; i < newLevel; i++) {
        update[i] = this._header;
      }
      this._level = newLevel;
    }

    const newNode: SkipListNode = {
      timestamp,
      value,
      tags,
      forward: new Array<SkipListNode | null>(newLevel),
    };

    for (let i = 0; i < newLevel; i++) {
      const prev = update[i];
      if (prev) {
        newNode.forward[i] = prev.forward[i] ?? null;
        prev.forward[i] = newNode;
      }
    }

    this._size += 1;
    if (this._minTimestamp === undefined || timestamp < this._minTimestamp) {
      this._minTimestamp = timestamp;
    }
    if (this._maxTimestamp === undefined || timestamp > this._maxTimestamp) {
      this._maxTimestamp = timestamp;
    }
  }

  public range(start: number, end: number): DataPoint[] {
    const results: DataPoint[] = [];
    let current: SkipListNode = this._header;

    for (let i = this._level - 1; i >= 0; i--) {
      while (current.forward[i] !== null && current.forward[i] !== undefined && current.forward[i]!.timestamp < start) {
        current = current.forward[i]!;
      }
    }

    let node = current.forward[0];
    while (node && node.timestamp <= end) {
      if (node.timestamp >= start) {
        results.push({ timestamp: node.timestamp, value: node.value });
      }
      node = node.forward[0];
    }

    return results;
  }

  public rangeEvents(metric: string, start: number, end: number, filterTags?: Readonly<Record<string, string>> | undefined): TimeSeriesEvent[] {
    const results: TimeSeriesEvent[] = [];
    let current: SkipListNode = this._header;

    for (let i = this._level - 1; i >= 0; i--) {
      while (current.forward[i] !== null && current.forward[i] !== undefined && current.forward[i]!.timestamp < start) {
        current = current.forward[i]!;
      }
    }

    let node = current.forward[0];
    while (node && node.timestamp <= end) {
      if (node.timestamp >= start) {
        let matchesTags = true;
        if (filterTags) {
          if (!node.tags) {
            matchesTags = false;
          } else {
            for (const [k, v] of Object.entries(filterTags)) {
              if (node.tags[k] !== v) {
                matchesTags = false;
                break;
              }
            }
          }
        }

        if (matchesTags) {
          results.push({
            metric,
            timestamp: node.timestamp,
            value: node.value,
            tags: node.tags,
          });
        }
      }
      node = node.forward[0];
    }

    return results;
  }

  public clear(): void {
    this._header.forward.fill(null);
    this._level = 1;
    this._size = 0;
    this._minTimestamp = undefined;
    this._maxTimestamp = undefined;
  }

  private randomLevel(): number {
    let lvl = 1;
    while (Math.random() < PROBABILITY && lvl < MAX_LEVEL) {
      lvl += 1;
    }
    return lvl;
  }
}
