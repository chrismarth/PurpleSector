import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@purplesector/db-prisma';
import { requireAuthUserId } from '@/lib/api-auth';

// GET /api/sessions/[id]/event-laps - Get all laps from the event
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    let userId: string;
    try {
      userId = requireAuthUserId();
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the session to find its event
    const session = await (prisma as any).session.findFirst({
      where: { id: params.id, userId },
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Get all sessions in the event
    const sessions = await (prisma as any).session.findMany({
      where: { eventId: session.eventId, userId },
      select: { id: true, name: true },
    });

    const sessionIds = (sessions as any[]).map((s: any) => s.id);

    // Get all laps from all sessions in the event
    const laps = await (prisma as any).lap.findMany({
      where: {
        userId,
        sessionId: { in: sessionIds },
        lapTime: { not: null },
      },
      select: {
        id: true,
        lapNumber: true,
        lapTime: true,
        sessionId: true,
      },
      orderBy: {
        lapTime: 'asc',
      },
    });

    // Add session name to each lap
    const lapsWithSession = (laps as any[]).map((lap: any) => ({
      ...lap,
      sessionName: (sessions as any[]).find((s: any) => s.id === lap.sessionId)?.name || 'Unknown',
    }));

    return NextResponse.json(lapsWithSession);
  } catch (error) {
    console.error('Error fetching event laps:', error);
    return NextResponse.json(
      { error: 'Failed to fetch event laps' },
      { status: 500 }
    );
  }
}
