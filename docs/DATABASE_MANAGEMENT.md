# Database Management Guide

This guide explains how to manage the Purple Sector database and prevent corruption issues.

## Common Issues

### Orphaned Session References

**Symptoms:**
- Console errors: `Session [id] not found, cannot create lap`
- Telemetry data not saving properly
- Laps appearing in UI but not in database

**Cause:**
- Sessions were deleted but frontend still references them
- Browser cache holding old session IDs
- Multiple tabs/windows with stale data

## Quick Fixes

### 1. Check Database Health

```bash
npm run db:check
```

This will scan for:
- Orphaned sessions (no parent event)
- Orphaned laps (no parent session)
- Sessions with invalid event IDs
- Laps with invalid session IDs

### 2. Reset Database

```bash
npm run db:reset
```

This will:
1. Delete the existing database
2. Recreate schema
3. Generate Prisma client

**⚠️ Warning:** This deletes ALL data!

### 3. Clear Browser Cache

After resetting the database:
1. Hard refresh: `Ctrl+Shift+R` (Linux/Windows) or `Cmd+Shift+R` (Mac)
2. Or clear `.next/` cache: `rm -rf .next/`
3. Restart dev server

## Prevention Strategies

### 1. Always Create Sessions Through UI

❌ **Don't:**
- Manually create sessions in Prisma Studio
- Use old session IDs from previous database states

✅ **Do:**
- Create events and sessions through the web UI
- Use the "New Event" and "New Session" buttons

### 2. Clean Workflow

When starting fresh:

```bash
# 1. Reset database
npm run db:reset

# 2. Clear Next.js cache
rm -rf .next/

# 3. Start servers
npm run dev          # Terminal 1
npm run ws-server    # Terminal 2

# 4. Open browser and create new event/session
```

### 3. Avoid Concurrent Edits

- Don't delete events/sessions while telemetry is streaming
- Close other tabs before deleting
- Stop WebSocket server before database operations

## Database Schema

The schema uses **cascade deletes** to prevent orphans:

```prisma
model Session {
  event Event @relation(fields: [eventId], references: [id], onDelete: Cascade)
}

model Lap {
  session Session @relation(fields: [sessionId], references: [id], onDelete: Cascade)
}
```

This means:
- Deleting an **Event** → Deletes all **Sessions** → Deletes all **Laps**
- Deleting a **Session** → Deletes all **Laps**

## Troubleshooting

### Issue: "Session not found" errors persist

**Solution:**
1. Check browser console for session ID
2. Run `npm run db:check` to verify session exists
3. If not found, hard refresh browser
4. If still failing, reset database

### Issue: Laps not appearing after creation

**Solution:**
1. Check Network tab for API errors
2. Verify session is "active" status
3. Check WebSocket connection (should show "Connected")
4. Restart WebSocket server

### Issue: Database locked

**Solution:**
```bash
# Kill any processes using the database
pkill -f "prisma studio"
pkill -f "next dev"

# Remove lock file
rm -f prisma/dev.db-journal

# Restart
npm run dev
```

## Best Practices

### Development Workflow

1. **Start Clean:**
   ```bash
   npm run db:reset
   rm -rf .next/
   ```

2. **Start Services:**
   ```bash
   npm run dev          # Terminal 1
   npm run ws-server    # Terminal 2
   ```

3. **Create Data:**
   - Open browser → Create Event → Create Session
   - Start telemetry streaming

4. **Before Stopping:**
   - Stop telemetry stream
   - Close browser tabs
   - Stop servers with `Ctrl+C`

### Production Considerations

For production, you should:

1. **Use PostgreSQL instead of SQLite**
   - Better concurrency handling
   - More robust transactions
   - No lock file issues

2. **Add Connection Pooling**
   ```typescript
   // packages/db-prisma/prisma/schema.prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

3. **Implement Soft Deletes**
   - Add `deletedAt` field
   - Filter out deleted records
   - Allows recovery

4. **Add Database Backups**
   ```bash
   # Backup
   cp prisma/dev.db prisma/backups/dev-$(date +%Y%m%d).db
   
   # Restore
   cp prisma/backups/dev-20250109.db prisma/dev.db
   ```

## Useful Commands

```bash
# Database Management
npm run db:check      # Check for issues
npm run db:reset      # Reset database
npm run db:push       # Push schema changes
npm run db:studio     # Open Prisma Studio

# Development
npm run dev           # Start Next.js
npm run ws-server     # Start WebSocket server
npm run telemetry     # Start telemetry collector (for real AC data)

# Cleanup
rm -rf .next/         # Clear Next.js cache
rm -f prisma/dev.db   # Delete database
```

## Getting Help

If you continue to experience database issues:

1. Run `npm run db:check` and save output
2. Check browser console for errors
3. Check server logs for Prisma errors
4. Note the exact steps to reproduce

Common error patterns:
- `Session [id] not found` → Orphaned reference, reset DB
- `Unique constraint failed` → Duplicate lap, check lap numbers
- `Database is locked` → Kill processes, remove journal file
