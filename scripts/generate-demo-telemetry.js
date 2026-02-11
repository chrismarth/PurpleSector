#!/usr/bin/env node
/**
 * Generate realistic demo telemetry JSON for the demo-kafka collector.
 *
 * Uses the same correlated physics model as DemoCollector.generateFallbackDemoData()
 * so the file-based and generated paths produce equivalent quality data.
 *
 * Usage:
 *   node scripts/generate-demo-telemetry.js [output-path]
 *
 * Default output: collectors/demo-data/demo-telemetry.json
 */

'use strict';

const fs = require('fs');
const path = require('path');

const FRAME_RATE = 60;

// Track profile: each segment defines a target speed and curvature.
// Gives realistic correlations between throttle/brake/steering/speed.
const TRACK_PROFILE = [
  { from: 0.0,  to: 0.12, targetKmh: 235, curvature:  0.05 },
  { from: 0.12, to: 0.18, targetKmh:  95, curvature:  0.85 },
  { from: 0.18, to: 0.33, targetKmh: 210, curvature: -0.18 },
  { from: 0.33, to: 0.40, targetKmh: 125, curvature: -0.65 },
  { from: 0.40, to: 0.55, targetKmh: 205, curvature:  0.12 },
  { from: 0.55, to: 0.63, targetKmh:  80, curvature:  0.95 },
  { from: 0.63, to: 0.78, targetKmh: 190, curvature: -0.22 },
  { from: 0.78, to: 0.90, targetKmh: 145, curvature:  0.55 },
  { from: 0.90, to: 1.01, targetKmh: 220, curvature: -0.08 },
];

// Gear ratios for RPM computation; tuned for plausible RPM bands.
const GEAR_RATIOS = [0, 14.2, 10.4, 7.7, 6.0, 5.0, 4.2];
const FINAL_DRIVE = 1.0;
const UPSHIFT_RPM = 8200;
const DOWNSHIFT_RPM = 2600;

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

const getSegment = (pos) =>
  TRACK_PROFILE.find((s) => pos >= s.from && pos < s.to) ?? TRACK_PROFILE[TRACK_PROFILE.length - 1];

const rpmFromSpeed = (kmh, g) => {
  const base = kmh * (GEAR_RATIOS[g] ?? GEAR_RATIOS[6]) * FINAL_DRIVE * 7.4;
  return clamp(base + 1100, 1200, 9200);
};

/**
 * Deterministic pseudo-random jitter seeded by lap and frame index.
 */
const jitter = (lapIndex, i) => {
  const x = Math.sin((lapIndex + 1) * 997 + (i + 1) * 0.013) * 10000;
  return x - Math.floor(x);
};

function generateLap(lapIndex, durationMs) {
  const totalFrames = Math.round((durationMs / 1000) * FRAME_RATE);
  const lapNumber = lapIndex + 1;
  const variation = 1 + (lapIndex - 1) * 0.012;
  const dt = 1 / FRAME_RATE;

  let speedKmh = 110 * variation;
  let gear = 3;
  const frames = [];

  for (let i = 0; i < totalFrames; i++) {
    const t = i / totalFrames;
    const lapTime = (i / FRAME_RATE) * 1000;
    const seg = getSegment(t);

    const noise = (jitter(lapIndex, i) - 0.5) * 0.08;
    const targetKmh = seg.targetKmh * variation * (1 + noise * 0.35);
    const curvature = seg.curvature * (1 + noise * 0.2);

    const error = targetKmh - speedKmh;

    let throttle = clamp(error / 55, 0, 1);
    let brake = clamp(-error / 40, 0, 1);

    const cornerLift = clamp(Math.abs(curvature) - 0.35, 0, 1);
    throttle = clamp(throttle * (1 - 0.55 * cornerLift), 0, 1);

    if (brake > 0.08) {
      throttle = Math.min(throttle, 0.05);
    }

    const speedNorm = clamp(speedKmh / 240, 0, 1);
    let steering = curvature * (1 - 0.55 * speedNorm) + noise * 0.08;
    steering = clamp(steering, -1, 1);

    const accelKmhPerSec = 30 * throttle;
    const brakeKmhPerSec = 55 * brake;
    const aeroDragKmhPerSec = (0.028 * speedKmh * speedKmh) / 100;
    const cornerDragKmhPerSec = 10 * Math.abs(steering) * speedNorm;

    speedKmh += (accelKmhPerSec - brakeKmhPerSec - aeroDragKmhPerSec - cornerDragKmhPerSec) * dt;
    speedKmh = clamp(speedKmh, 35, 260);

    let rpm = rpmFromSpeed(speedKmh, gear);

    if (throttle > 0.55 && rpm > UPSHIFT_RPM && gear < 6) {
      gear += 1;
      rpm = rpmFromSpeed(speedKmh, gear);
    }
    if (brake > 0.25 && rpm < DOWNSHIFT_RPM && gear > 1) {
      gear -= 1;
      rpm = rpmFromSpeed(speedKmh, gear);
    }

    if (throttle > 0.2 && brake < 0.05) {
      throttle = clamp(throttle + Math.sin(t * Math.PI * 18) * 0.035 + noise * 0.02, 0, 1);
    }
    if (brake > 0.15) {
      brake = clamp(brake + Math.sin(t * Math.PI * 14) * 0.04 + noise * 0.02, 0, 1);
    }

    frames.push({
      timestamp: 0, // placeholder — collector sets real timestamps at playback
      throttle: +clamp(throttle, 0, 1).toFixed(4),
      brake: +clamp(brake, 0, 1).toFixed(4),
      steering: +clamp(steering, -1, 1).toFixed(4),
      speed: +speedKmh.toFixed(2),
      gear,
      rpm: +rpm.toFixed(1),
      normalizedPosition: +t.toFixed(6),
      lapNumber,
      lapTime: +lapTime.toFixed(2),
    });
  }

  return { lapNumber, lapTime: durationMs, frames };
}

// ---------------------------------------------------------------------------

const LAP_DURATIONS_MS = [30000, 30500, 31000];

const output = {
  description: 'Generated demo telemetry — correlated physics model (~30 s laps)',
  track: 'Demo Circuit',
  car: 'Demo Car',
  frameRate: FRAME_RATE,
  laps: LAP_DURATIONS_MS.map((dur, idx) => generateLap(idx, dur)),
};

const totalFrames = output.laps.reduce((s, l) => s + l.frames.length, 0);

const dest = process.argv[2]
  || path.join(__dirname, '..', 'collectors', 'demo-data', 'demo-telemetry.json');

fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, JSON.stringify(output, null, 2) + '\n');

console.log(`Wrote ${dest}`);
console.log(`  Laps: ${output.laps.length}`);
console.log(`  Total frames: ${totalFrames}`);
console.log(`  Frame rate: ${FRAME_RATE} Hz`);
