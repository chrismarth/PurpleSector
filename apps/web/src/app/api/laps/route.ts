import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@purplesector/db-prisma';
import { requireAuthUserId } from '@/lib/auth';
import { requireCanReadSessionById } from '@/lib/access-control';
import type { LapSummary } from '@/types/core';

// GET /api/laps?sessionId=X                  → { laps: [{ id, lapNumber, lapTime }] }
// GET /api/laps?sessionId=X&lapNumber=Y      → { lapId: string }
// GET /api/laps?eventSessionId=X             → EventLap[] (all laps in same event)
export async function GET(request: NextRequest) {
  try {
    let userId: string;
    try {
      userId = requireAuthUserId();
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const sessionId = searchParams.get('sessionId');
    const eventSessionId = searchParams.get('eventSessionId');

    // ── Event laps: all laps across every session in the same event ──────
    if (eventSessionId) {
      await requireCanReadSessionById({ requesterUserId: userId, sessionId: eventSessionId });

      const anchorSession = await (prisma as any).session.findUnique({
        where: { id: eventSessionId },
        select: { eventId: true },
      });
      if (!anchorSession) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }

      const eventSessions = await (prisma as any).session.findMany({
        where: { eventId: anchorSession.eventId },
        select: { id: true, name: true },
      });
      const sessionIds = eventSessions.map((s: any) => s.id);
      const nameById = Object.fromEntries(eventSessions.map((s: any) => [s.id, s.name]));

      const laps = await prisma.lap.findMany({
        where: { sessionId: { in: sessionIds } },
        select: { id: true, sessionId: true, lapNumber: true, lapTime: true },
        orderBy: [{ sessionId: 'asc' }, { lapNumber: 'asc' }],
      });

      return NextResponse.json(
        laps.map((l) => ({
          id: l.id,
          lapNumber: l.lapNumber,
          lapTime: l.lapTime,
          sessionName: nameById[l.sessionId] ?? 'Unknown Session',
        }))
      );
    }

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId or eventSessionId query parameter is required' },
        { status: 400 }
      );
    }

    await requireCanReadSessionById({ requesterUserId: userId, sessionId });

    // ── List laps for session (returns LapSummary[]) ────────────────────
    const rows = await prisma.lap.findMany({
      where: { sessionId },
      select: { id: true, sessionId: true, lapNumber: true, lapTime: true, analyzed: true, tags: true },
      orderBy: { lapNumber: 'asc' },
    });
    const laps: LapSummary[] = rows.map((l) => ({
      id: l.id,
      sessionId: l.sessionId,
      lapNumber: l.lapNumber,
      lapTime: l.lapTime,
      analyzed: l.analyzed,
      tags: l.tags,
    }));
    return NextResponse.json({ laps });
  } catch (error) {
    if ((error as any)?.code === 'NOT_FOUND') {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    if ((error as any)?.code === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Error fetching laps:', error);
    return NextResponse.json({ error: 'Failed to fetch laps' }, { status: 500 });
  }
}

// POST /api/laps - Create a new lap
export async function POST(request: NextRequest) {
  try {
    let userId: string;
    try {
      userId = requireAuthUserId();
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Lap creation is handled by the pipeline' },
      { status: 410 }
    );
  } catch (error) {
    if ((error as any)?.code === 'P2002') {
      return NextResponse.json({ error: 'Lap already exists' }, { status: 409 });
    }
    console.error('Error creating lap:', error);
    return NextResponse.json(
      { error: 'Failed to create lap' },
      { status: 500 }
    );
  }
}
