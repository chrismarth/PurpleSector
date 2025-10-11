/**
 * Generate realistic demo telemetry data with variations
 * 
 * This creates multiple simulated laps with different characteristics:
 * - Different lap times
 * - Varied braking points and intensity
 * - Different throttle application styles
 * - Steering input variations
 */

const fs = require('fs');
const path = require('path');

// Lap configuration
const BASE_LAP_TIME_SECONDS = 30; // Base lap time
const FRAME_RATE = 60; // 60 Hz
const NUM_LAPS = 5; // Generate 5 different laps

// Lap variation profiles
const LAP_PROFILES = [
  { name: 'Optimal', timeVariation: 0, brakingOffset: 0, throttleSmooth: 1.0, aggression: 1.0 },
  { name: 'Conservative', timeVariation: 0.8, brakingOffset: -0.05, throttleSmooth: 0.85, aggression: 0.85 },
  { name: 'Aggressive', timeVariation: 0.3, brakingOffset: 0.03, throttleSmooth: 0.75, aggression: 1.15 },
  { name: 'Mistake', timeVariation: 1.5, brakingOffset: -0.08, throttleSmooth: 0.7, aggression: 0.9 },
  { name: 'Learning', timeVariation: 1.2, brakingOffset: -0.06, throttleSmooth: 0.8, aggression: 0.95 },
];

// Track sections (normalized position 0-1) - More corners, more action!
const TRACK_SECTIONS = [
  { start: 0.00, end: 0.08, type: 'straight', maxSpeed: 220 },
  { start: 0.08, end: 0.12, type: 'braking', entry: 220, exit: 80 },
  { start: 0.12, end: 0.18, type: 'corner', speed: 80, radius: 0.7 }, // Tight hairpin
  { start: 0.18, end: 0.25, type: 'acceleration', entry: 80, exit: 180 },
  { start: 0.25, end: 0.30, type: 'braking', entry: 180, exit: 120 },
  { start: 0.30, end: 0.38, type: 'corner', speed: 120, radius: 0.5 }, // Medium corner
  { start: 0.38, end: 0.48, type: 'acceleration', entry: 120, exit: 200 },
  { start: 0.48, end: 0.52, type: 'braking', entry: 200, exit: 100 },
  { start: 0.52, end: 0.60, type: 'corner', speed: 100, radius: 0.6 }, // Sweeper
  { start: 0.60, end: 0.70, type: 'acceleration', entry: 100, exit: 210 },
  { start: 0.70, end: 0.75, type: 'braking', entry: 210, exit: 90 },
  { start: 0.75, end: 0.82, type: 'corner', speed: 90, radius: 0.8 }, // Final corner
  { start: 0.82, end: 1.00, type: 'acceleration', entry: 90, exit: 220 },
];

function interpolate(start, end, t) {
  return start + (end - start) * t;
}

function getTrackSection(position) {
  return TRACK_SECTIONS.find(
    section => position >= section.start && position < section.end
  ) || TRACK_SECTIONS[0];
}

function generateFrame(frameIndex, totalFrames, profile) {
  const lapTime = (frameIndex / FRAME_RATE) * 1000; // milliseconds
  const normalizedPosition = frameIndex / totalFrames;
  const section = getTrackSection(normalizedPosition);
  
  // Calculate local position within section
  const sectionProgress = (normalizedPosition - section.start) / (section.end - section.start);
  
  let throttle = 0;
  let brake = 0;
  let steering = 0;
  let speed = 0;
  let gear = 1;
  let rpm = 2000;

  switch (section.type) {
    case 'straight':
      throttle = 1.0 * profile.aggression;
      brake = 0;
      steering = Math.sin(sectionProgress * Math.PI * 8) * 0.05; // Small corrections
      speed = section.maxSpeed * (1 - profile.timeVariation * 0.02);
      gear = speed < 80 ? 2 : speed < 120 ? 3 : speed < 160 ? 4 : speed < 200 ? 5 : 6;
      rpm = 6000 + Math.sin(sectionProgress * Math.PI * 4) * 1500;
      break;

    case 'braking':
      throttle = 0;
      // Apply braking offset - negative means brake earlier (more conservative)
      const brakingPoint = Math.max(0, sectionProgress + profile.brakingOffset);
      brake = (0.95 - (brakingPoint * 0.4)) * profile.aggression;
      steering = 0.3 * sectionProgress;
      speed = interpolate(section.entry, section.exit, sectionProgress) * (1 - profile.timeVariation * 0.015);
      gear = Math.max(2, Math.floor(speed / 40));
      rpm = 4000 + (1 - sectionProgress) * 2500;
      break;

    case 'corner':
      // Throttle application affected by smoothness
      throttle = Math.min(1.0, sectionProgress * 1.8 * profile.throttleSmooth);
      brake = 0;
      // Steering smoothness affects corner entry
      steering = Math.sin(sectionProgress * Math.PI) * section.radius * 1.2 * (2 - profile.throttleSmooth);
      speed = (section.speed + (sectionProgress * 30)) * (1 - profile.timeVariation * 0.02);
      gear = Math.max(2, Math.floor(speed / 40));
      rpm = 4500 + throttle * 3000;
      break;

    case 'acceleration':
      throttle = (0.6 + (sectionProgress * 0.4)) * profile.throttleSmooth;
      brake = 0;
      steering = Math.max(0, section.radius || 0) * (1 - sectionProgress) * 0.8;
      speed = interpolate(section.entry, section.exit, sectionProgress) * (1 - profile.timeVariation * 0.01);
      gear = Math.max(2, Math.floor(speed / 40));
      rpm = 5000 + throttle * 3500;
      break;
  }

  // Add noise based on driver smoothness (less smooth = more noise)
  const noiseAmount = (2 - profile.throttleSmooth) * 0.03;
  const noise = () => (Math.random() - 0.5) * noiseAmount;
  const steeringNoise = () => (Math.random() - 0.5) * noiseAmount * 2;
  
  throttle = Math.max(0, Math.min(1, throttle + noise()));
  brake = Math.max(0, Math.min(1, brake + noise()));
  steering = Math.max(-1, Math.min(1, steering + steeringNoise()));

  return {
    timestamp: Date.now() + lapTime,
    throttle: parseFloat(throttle.toFixed(3)),
    brake: parseFloat(brake.toFixed(3)),
    steering: parseFloat(steering.toFixed(3)),
    speed: parseFloat(speed.toFixed(1)),
    gear,
    rpm: Math.floor(rpm),
    lapNumber: 1,
    lapTime: Math.floor(lapTime),
  };
}

// Generate multiple laps with variations
console.log('Generating demo telemetry data with variations...');
console.log(`Base lap time: ${BASE_LAP_TIME_SECONDS}s`);
console.log(`Frame rate: ${FRAME_RATE} Hz`);
console.log(`Number of laps: ${NUM_LAPS}`);

const allLaps = [];

LAP_PROFILES.forEach((profile, index) => {
  // Calculate lap time based on profile
  const lapTimeSeconds = BASE_LAP_TIME_SECONDS * (1 + profile.timeVariation / 100);
  const totalFrames = Math.floor(lapTimeSeconds * FRAME_RATE);
  
  console.log(`\nGenerating Lap ${index + 1} (${profile.name}):`);
  console.log(`  - Lap time: ${lapTimeSeconds.toFixed(3)}s`);
  console.log(`  - Braking offset: ${profile.brakingOffset > 0 ? 'later' : 'earlier'}`);
  console.log(`  - Throttle smoothness: ${(profile.throttleSmooth * 100).toFixed(0)}%`);
  console.log(`  - Aggression: ${(profile.aggression * 100).toFixed(0)}%`);
  
  const frames = [];
  for (let i = 0; i < totalFrames; i++) {
    frames.push(generateFrame(i, totalFrames, profile));
  }
  
  allLaps.push({
    lapNumber: index + 1,
    profile: profile.name,
    lapTime: lapTimeSeconds * 1000, // milliseconds
    frames,
  });
});

const demoData = {
  description: "Demo telemetry data with variations - Monza GP Circuit, Ferrari 488 GT3",
  track: "Monza",
  car: "Ferrari 488 GT3",
  laps: allLaps,
};

// Save to file
const outputPath = path.join(__dirname, '..', 'public', 'demo-telemetry.json');
fs.writeFileSync(outputPath, JSON.stringify(demoData, null, 2));

const fileSizeKB = (fs.statSync(outputPath).size / 1024).toFixed(2);
const totalFrames = allLaps.reduce((sum, lap) => sum + lap.frames.length, 0);
console.log(`\n✓ Generated ${NUM_LAPS} laps with ${totalFrames} total frames`);
console.log(`✓ Lap time range: ${Math.min(...allLaps.map(l => l.lapTime / 1000)).toFixed(3)}s - ${Math.max(...allLaps.map(l => l.lapTime / 1000)).toFixed(3)}s`);
console.log(`✓ Saved to ${outputPath}`);
console.log(`✓ File size: ${fileSizeKB} KB`);
