// Time series operations for math channels
import { TimeSeries } from './index';

/**
 * Compute numerical derivative (rate of change) of a time series
 * Uses central difference for interior points, forward/backward difference for endpoints
 */
export function derivative(series: TimeSeries): TimeSeries {
  if (series.length === 0) return [];
  if (series.length === 1) return [{ t: series[0].t, v: 0 }];

  return series.map((sample, i) => {
    if (sample.v === null) {
      return { t: sample.t, v: null };
    }

    let dv_dt: number;

    if (i === 0) {
      // Forward difference for first point
      const next = series[i + 1];
      if (next.v === null) {
        return { t: sample.t, v: null };
      }
      const dt = next.t - sample.t;
      dv_dt = dt !== 0 ? (next.v - sample.v) / dt : 0;
    } else if (i === series.length - 1) {
      // Backward difference for last point
      const prev = series[i - 1];
      if (prev.v === null) {
        return { t: sample.t, v: null };
      }
      const dt = sample.t - prev.t;
      dv_dt = dt !== 0 ? (sample.v - prev.v) / dt : 0;
    } else {
      // Central difference for interior points
      const prev = series[i - 1];
      const next = series[i + 1];
      if (prev.v === null || next.v === null) {
        return { t: sample.t, v: null };
      }
      const dt = next.t - prev.t;
      dv_dt = dt !== 0 ? (next.v - prev.v) / dt : 0;
    }

    return { t: sample.t, v: dv_dt };
  });
}

/**
 * Compute cumulative integral (area under curve) of a time series
 * Uses trapezoidal rule for numerical integration
 */
export function integral(series: TimeSeries): TimeSeries {
  if (series.length === 0) return [];

  const result: TimeSeries = [];
  let cumulative = 0;

  for (let i = 0; i < series.length; i++) {
    const sample = series[i];
    
    if (sample.v === null) {
      result.push({ t: sample.t, v: null });
      continue;
    }

    if (i > 0) {
      const prev = series[i - 1];
      if (prev.v !== null) {
        const dt = sample.t - prev.t;
        // Trapezoidal rule: area = (v1 + v2) / 2 * dt
        cumulative += ((prev.v + sample.v) / 2) * dt;
      }
    }

    result.push({ t: sample.t, v: cumulative });
  }

  return result;
}
