# NaN Lap Time Display Fix

## Issues

1. **NaN displayed for lap times** - "NaN:000NaN" shown in the Current Lap header
2. **Protobuf decode errors** - Server logs showing "index out of range" errors

## Root Causes

### Issue 1: NaN Lap Times

The `formatLapTime()` function only handled `null` values but not `undefined` or `NaN`:

```typescript
// Before
export function formatLapTime(seconds: number | null): string {
  if (seconds === null) return '--:--.---';
  // If seconds is undefined or NaN, it continues and produces NaN output
}
```

When telemetry data didn't have a valid `lapTime` field, the function received `undefined` or `NaN` and tried to format it, resulting in "NaN:000NaN".

### Issue 2: Protobuf Decode Errors

The WebSocket in the browser wasn't configured to receive binary data properly. By default, WebSocket receives binary data as `Blob`, but we need `ArrayBuffer` for protobuf decoding:

```typescript
// Before
const ws = new WebSocket('ws://localhost:8080');
// ws.binaryType defaults to 'blob'
```

When the server sent protobuf messages as binary, the browser received them as `Blob` objects. The conversion from `Blob` to `ArrayBuffer` was async and sometimes incomplete, causing decode errors.

## Solutions

### Fix 1: Handle Invalid Lap Times

Updated `formatLapTime()` to handle `undefined` and `NaN`:

```typescript
// After
export function formatLapTime(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || isNaN(seconds)) {
    return '--:--.---';
  }
  // Now safely formats only valid numbers
}
```

Also added safety check in the component:

```typescript
// Before
{formatLapTime(data[data.length - 1].lapTime / 1000)}

// After
{formatLapTime(data[data.length - 1]?.lapTime ? 
  data[data.length - 1].lapTime / 1000 : undefined)}
```

### Fix 2: Set WebSocket Binary Type

Configured WebSocket to receive binary data as `ArrayBuffer`:

```typescript
// After
const ws = new WebSocket('ws://localhost:8080');
ws.binaryType = 'arraybuffer'; // Receive as ArrayBuffer for protobuf
```

This ensures:
- Binary data arrives as `ArrayBuffer` (not `Blob`)
- Synchronous access to buffer data
- No async conversion needed
- Protobuf can decode immediately

## Files Modified

1. **`src/lib/utils.ts`**
   - Updated `formatLapTime()` to handle `undefined` and `NaN`

2. **`packages/web-charts/src/TelemetryPlotPanel.tsx`**
   - Added safety check for `lapTime` field

3. **`src/app/session/[id]/page.tsx`**
   - Set `ws.binaryType = 'arraybuffer'`

## Testing

### Before Fix

**Lap Time Display:**
```
Current Lap: #1  ⏱ NaN:000NaN
```

**Server Logs:**
```
Failed to decode protobuf message: index out of range: 3 + 116 > 15
Falling back to JSON for this client
```

### After Fix

**Lap Time Display:**
```
Current Lap: #1  ⏱ 0:00.000    (valid time)
Current Lap: #1  ⏱ --:--.---   (no data yet)
```

**Server Logs:**
```
✓ Protocol Buffers initialized
✓ Client connected
Client switched to protobuf mode
(No decode errors)
```

## How to Verify

1. **Start services:**
   ```bash
   npm run ws-server
   npm run dev
   ```

2. **Create new session** and set to "active"

3. **Check lap time display:**
   - Should show `--:--.---` when no data
   - Should show valid time like `0:00.123` when receiving telemetry
   - Should **never** show `NaN`

4. **Check server logs:**
   - Should see "Protocol Buffers initialized"
   - Should see "Client switched to protobuf mode"
   - Should **not** see "Failed to decode protobuf message"

## WebSocket Binary Types

For reference, WebSocket supports two binary types:

| Type | Description | Use Case |
|------|-------------|----------|
| `'blob'` | Default, async access | File uploads, large data |
| `'arraybuffer'` | Sync access | Protocol buffers, real-time data |

For protobuf, we need `'arraybuffer'` because:
- Protobuf decoding is synchronous
- We need immediate access to buffer data
- No async conversion overhead
- Better performance for real-time telemetry

## Related Issues

This fix also resolves:
- Empty telemetry displays showing NaN
- Initial connection showing invalid times
- Protobuf fallback to JSON unnecessarily

---

**Status**: ✅ Fixed  
**Impact**: Clean lap time display + reliable protobuf  
**Tested**: Yes - verified with demo mode
