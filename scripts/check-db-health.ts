/**
 * Database Health Check Script
 * 
 * Checks for orphaned records and data integrity issues
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDatabaseHealth() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  Database Health Check');
  console.log('═══════════════════════════════════════════════════\n');

  try {
    // Check 1: Count all records
    const eventCount = await prisma.event.count();
    const sessionCount = await prisma.session.count();
    const lapCount = await prisma.lap.count();

    console.log('📊 Record Counts:');
    console.log(`   Events:   ${eventCount}`);
    console.log(`   Sessions: ${sessionCount}`);
    console.log(`   Laps:     ${lapCount}\n`);

    // Check 2: Find orphaned sessions (sessions without events)
    const orphanedSessions = await prisma.session.findMany({
      where: {
        event: null,
      },
    });

    if (orphanedSessions.length > 0) {
      console.log('⚠️  Orphaned Sessions (no parent event):');
      orphanedSessions.forEach(s => {
        console.log(`   - ${s.id} (${s.name})`);
      });
      console.log('');
    }

    // Check 3: Find orphaned laps (laps without sessions)
    const orphanedLaps = await prisma.lap.findMany({
      where: {
        session: null,
      },
    });

    if (orphanedLaps.length > 0) {
      console.log('⚠️  Orphaned Laps (no parent session):');
      orphanedLaps.forEach(l => {
        console.log(`   - ${l.id} (Lap ${l.lapNumber})`);
      });
      console.log('');
    }

    // Check 4: Find sessions with invalid event IDs
    const allSessions = await prisma.session.findMany({
      include: {
        event: true,
      },
    });

    const sessionsWithMissingEvents = allSessions.filter(s => !s.event);
    if (sessionsWithMissingEvents.length > 0) {
      console.log('❌ Sessions with missing events:');
      sessionsWithMissingEvents.forEach(s => {
        console.log(`   - ${s.id} (${s.name}) -> Event ID: ${s.eventId}`);
      });
      console.log('');
    }

    // Check 5: Find laps with invalid session IDs
    const allLaps = await prisma.lap.findMany({
      include: {
        session: true,
      },
    });

    const lapsWithMissingSessions = allLaps.filter(l => !l.session);
    if (lapsWithMissingSessions.length > 0) {
      console.log('❌ Laps with missing sessions:');
      lapsWithMissingSessions.forEach(l => {
        console.log(`   - ${l.id} (Lap ${l.lapNumber}) -> Session ID: ${l.sessionId}`);
      });
      console.log('');
    }

    // Summary
    const totalIssues = 
      orphanedSessions.length + 
      orphanedLaps.length + 
      sessionsWithMissingEvents.length + 
      lapsWithMissingSessions.length;

    console.log('═══════════════════════════════════════════════════');
    if (totalIssues === 0) {
      console.log('✅ Database is healthy! No issues found.');
    } else {
      console.log(`⚠️  Found ${totalIssues} issue(s)`);
      console.log('\nRecommendation: Run ./scripts/reset-db.sh to fix');
    }
    console.log('═══════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error checking database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabaseHealth();
