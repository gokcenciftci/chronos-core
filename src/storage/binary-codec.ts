import { type TimeSeriesEvent } from "../core/types.js";

export const CHRONOS_MAGIC = 0xcc;

export const computeChecksum = (buf: Uint8Array, start: number, end: number): number => {
  let a = 1;
  let b = 0;
  for (let i = start; i < end; i++) {
    a = (a + (buf[i] ?? 0)) % 65521;
    b = (b + a) % 65521;
  }
  return ((b << 16) | a) >>> 0;
};

export class BinaryCodec {
  public static encodeEvent(event: TimeSeriesEvent): Buffer {
    const metricBuffer = Buffer.from(event.metric, "utf8");
    if (metricBuffer.length > 255) {
      throw new Error(`Metric name '${event.metric}' exceeds maximum byte length of 255`);
    }

    const tagsJson = event.tags ? JSON.stringify(event.tags) : "";
    const tagsBuffer = Buffer.from(tagsJson, "utf8");

    const payloadLength = 1 + 1 + metricBuffer.length + 8 + 8 + 2 + tagsBuffer.length;
    const totalLength = payloadLength + 4;

    const buffer = Buffer.allocUnsafe(totalLength);
    let offset = 0;

    buffer.writeUInt8(CHRONOS_MAGIC, offset++);
    buffer.writeUInt8(metricBuffer.length, offset++);
    metricBuffer.copy(buffer, offset);
    offset += metricBuffer.length;

    buffer.writeDoubleBE(event.value, offset);
    offset += 8;

    buffer.writeBigInt64BE(BigInt(event.timestamp), offset);
    offset += 8;

    buffer.writeUInt16BE(tagsBuffer.length, offset);
    offset += 2;

    if (tagsBuffer.length > 0) {
      tagsBuffer.copy(buffer, offset);
      offset += tagsBuffer.length;
    }

    const checksum = computeChecksum(buffer, 0, offset);
    buffer.writeUInt32BE(checksum, offset);

    return buffer;
  }

  public static decodeEvent(buffer: Buffer, startOffset: number = 0): { event: TimeSeriesEvent; bytesRead: number } {
    let offset = startOffset;

    if (buffer.length - offset < 24) {
      throw new Error("Buffer too short for Chronos binary event");
    }

    const magic = buffer.readUInt8(offset++);
    if (magic !== CHRONOS_MAGIC) {
      throw new Error(`Invalid Chronos magic byte: expected 0xCC, got 0x${magic.toString(16)}`);
    }

    const metricLen = buffer.readUInt8(offset++);
    const metric = buffer.toString("utf8", offset, offset + metricLen);
    offset += metricLen;

    const value = buffer.readDoubleBE(offset);
    offset += 8;

    const timestamp = Number(buffer.readBigInt64BE(offset));
    offset += 8;

    const tagsLen = buffer.readUInt16BE(offset);
    offset += 2;

    let tags: Record<string, string> | undefined;
    if (tagsLen > 0) {
      const tagsStr = buffer.toString("utf8", offset, offset + tagsLen);
      offset += tagsLen;
      try {
        tags = JSON.parse(tagsStr);
      } catch {
        tags = undefined;
      }
    }

    const expectedChecksum = buffer.readUInt32BE(offset);
    const actualChecksum = computeChecksum(buffer, startOffset, offset);
    offset += 4;

    if (expectedChecksum !== actualChecksum) {
      throw new Error(`Checksum mismatch: expected ${expectedChecksum}, got ${actualChecksum}`);
    }

    const event: TimeSeriesEvent = {
      metric,
      timestamp,
      value,
      tags: tags ? Object.freeze({ ...tags }) : undefined,
    };

    return {
      event,
      bytesRead: offset - startOffset,
    };
  }
}
