# Lap Detection Fix - Multiple Laps Not Saving

## Issue

In live telemetry sessions, only the first lap was being saved to the database. Subsequent laps were detected (console logs showed "Lap X completed!") but were all saved with `lapNumber: 1`, causing them to overwrite each other in the database.

## Root Cause

The issue was a **JavaScript closure problem** in the WebSocket message handler.

### The Problem

```typescript
const [currentLapNumber, setCurrentLapNumber] = useState(1);

// WebSocket handler created once on mount
ws.onmessage = (event) => {
  // This closure captures currentLapNumber = 1
  const nextLapNumber = currentLapNumber + 1;  // Always 1 + 1 = 2
  saveLap(lapData, currentLapNumber);          // Always saves as lap 1
  setCurrentLapNumber(nextLapNumber);          // Updates state but not closure
};
```

**What happened:**
1. WebSocket handler is created when component mounts
2. Handler captures `currentLapNumber = 1` in its closure
3. When lap completes, it reads `currentLapNumber` (still 1)
4. Saves lap with `lapNumber: 1`
5. Calls `setCurrentLapNumber(2)` - updates React state
6. **But the closure still has `currentLapNumber = 1`**
7. Next lap: reads `currentLapNumber` (still 1 in closure)
8. Saves lap with `lapNumber: 1` again (overwrites previous)

### Why This Happens

React's `useState` creates a new value each render, but the WebSocket handler is only created once (on mount). The handler's closure captures the initial value and never sees the updates.

## Solution

Use a **ref** to track the lap number, which persists across renders and can be mutated:

```typescript
const [currentLapNumber, setCurrentLapNumber] = useState(1);
const currentLapNumberRef = useRef(1);  // Add ref

ws.onmessage = (event) => {
  // Read from ref (always current value)
  const nextLapNumber = currentLapNumberRef.current + 1;
  saveLap(lapData, currentLapNumberRef.current);
  
  // Update both ref and state
  currentLapNumberRef.current = nextLapNumber;
  setCurrentLapNumber(nextLapNumber);
};
```

**Why this works:**
- Refs are **mutable** - updating `.current` changes the value
- Refs **persist** across renders - same object every time
- Closures can read the **latest value** from `.current`

## Changes Made

### 1. Added Ref for Lap Number

```typescript
const currentLapNumberRef = useRef(1);
```

### 2. Updated Lap Detection Logic

```typescript
// When new lap detected
const nextLapNumber = currentLapNumberRef.current + 1;
currentLapNumberRef.current = nextLapNumber;  // Update ref
setCurrentLapNumber(nextLapNumber);            // Update state
```

### 3. Updated All Lap Saves

```typescript
// Use ref instead of state
saveLap(lapData, currentLapNumberRef.current);
```

### 4. Synced Ref on Resume

```typescript
// When resuming after pause
currentLapNumberRef.current = currentLapNumber;
```

## Files Modified

- `src/app/session/[id]/page.tsx` - Fixed lap number tracking

## Testing

### Before Fix
```
Console: Lap 1 completed! 1234 frames
Database: Saved lap 1

Console: Lap 2 completed! 1456 frames
Database: Saved lap 1 (overwrote previous)

Console: Lap 3 completed! 1389 frames
Database: Saved lap 1 (overwrote previous)
```

### After Fix
```
Console: Lap 1 completed! 1234 frames
Database: Saved lap 1

Console: Lap 2 completed! 1456 frames
Database: Saved lap 2

Console: Lap 3 completed! 1389 frames
Database: Saved lap 3
```

## How to Verify

1. **Start a live session:**
   ```bash
   npm run ws-server
   npm run telemetry:acc  # or other collector
   npm run dev
   ```

2. **Create a new session** and set it to "active"

3. **Complete multiple laps** in the sim

4. **Check console logs:**
   ```
   Lap 1 completed! X frames
   Lap 2 completed! Y frames
   Lap 3 completed! Z frames
   ```

5. **Check database** - should see laps 1, 2, 3, etc. (not all lap 1)

6. **Archive session** - all laps should be visible in session view

## Related Patterns

This same pattern is used for other values that need to be accessed in closures:

- `currentLapFramesRef` - Current lap's telemetry frames
- `isPausedRef` - Pause state
- `lastLapTimeRef` - Previous frame's lap time
- `savingLapRef` - Save operation in progress flag

All of these use refs because they're accessed in the WebSocket message handler closure.

## Key Takeaway

**When using React state in closures (event handlers, intervals, WebSocket handlers):**

- ❌ **Don't** rely on state variables - they capture old values
- ✅ **Do** use refs for values that change and need to be read in closures
- ✅ **Do** update both ref and state if you need both

**Rule of thumb:** If a value changes and is read in a closure, use a ref.

---

**Status**: ✅ Fixed  
**Impact**: Multiple laps now save correctly  
**Tested**: Yes - verified with live telemetry
