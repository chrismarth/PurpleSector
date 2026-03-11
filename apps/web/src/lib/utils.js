"use strict";
// Utility functions
Object.defineProperty(exports, "__esModule", { value: true });
exports.cn = cn;
exports.formatLapTime = formatLapTime;
exports.formatTimestamp = formatTimestamp;
exports.normalizeTelemetryFrames = normalizeTelemetryFrames;
exports.calculateLapTime = calculateLapTime;
const clsx_1 = require("clsx");
const tailwind_merge_1 = require("tailwind-merge");
function cn(...inputs) {
    return (0, tailwind_merge_1.twMerge)((0, clsx_1.clsx)(inputs));
}
function formatLapTime(seconds) {
    if (seconds === null || seconds === undefined || isNaN(seconds))
        return '--:--.---';
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toFixed(3).padStart(6, '0')}`;
}
function formatTimestamp(date) {
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
}
function normalizeTelemetryFrames(frames) {
    if (frames.length === 0)
        return frames;
    // Normalize lapTime so the first frame starts at 0
    // This handles cases where lapTime is cumulative across laps
    const firstFrameTime = frames[0].lapTime;
    return frames.map(frame => ({
        ...frame,
        lapTime: frame.lapTime - firstFrameTime,
    }));
}
function calculateLapTime(frames) {
    if (frames.length === 0)
        return null;
    // Calculate lap time as the difference between last and first frame
    // This handles cases where lapTime is cumulative across laps
    const firstFrame = frames[0];
    const lastFrame = frames[frames.length - 1];
    const lapTimeMs = lastFrame.lapTime - firstFrame.lapTime;
    return lapTimeMs / 1000; // Convert ms to seconds
}
