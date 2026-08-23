import { type AggregateType } from "../core/types.js";

export const calculatePercentile = (sortedValues: readonly number[], p: number): number => {
  if (sortedValues.length === 0) return 0;
  const index = Math.ceil((p / 100) * sortedValues.length) - 1;
  const clamped = Math.max(0, Math.min(sortedValues.length - 1, index));
  return sortedValues[clamped] ?? 0;
};

export const calculateStdDev = (values: readonly number[], mean: number): number => {
  if (values.length <= 1) return 0;
  const sumSquaredDiff = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0);
  return Math.sqrt(sumSquaredDiff / (values.length - 1));
};

export const computeAggregates = (
  values: readonly number[],
  timeSpanSeconds?: number | undefined
): Record<AggregateType, number> => {
  if (values.length === 0) {
    return {
      count: 0,
      sum: 0,
      mean: 0,
      min: 0,
      max: 0,
      stddev: 0,
      p50: 0,
      p90: 0,
      p95: 0,
      p99: 0,
      rate: 0,
    };
  }

  let sum = 0;
  let min = values[0]!;
  let max = values[0]!;

  for (let i = 0; i < values.length; i++) {
    const v = values[i]!;
    sum += v;
    if (v < min) min = v;
    if (v > max) max = v;
  }

  const mean = sum / values.length;
  const sorted = [...values].sort((a, b) => a - b);
  const stddev = calculateStdDev(values, mean);
  const rate = timeSpanSeconds && timeSpanSeconds > 0 ? Number((values.length / timeSpanSeconds).toFixed(4)) : 0;

  return {
    count: values.length,
    sum: Number(sum.toFixed(4)),
    mean: Number(mean.toFixed(4)),
    min,
    max,
    stddev: Number(stddev.toFixed(4)),
    p50: calculatePercentile(sorted, 50),
    p90: calculatePercentile(sorted, 90),
    p95: calculatePercentile(sorted, 95),
    p99: calculatePercentile(sorted, 99),
    rate,
  };
};
