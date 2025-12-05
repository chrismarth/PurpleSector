import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@purplesector/db-prisma';

// GET /api/sessions/[id]/event-laps - Get all laps from the event
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get the session to find its event
    const session = await prisma.session.findUnique({
      where: { id: params.id },
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Get all sessions in the event
    const sessions = await prisma.session.findMany({
      where: { eventId: session.eventId },
      select: { id: true, name: true },
    });

    const sessionIds = sessions.map(s => s.id);

    // Get all laps from all sessions in the event
    const laps = await prisma.lap.findMany({
      where: {
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
    const lapsWithSession = laps.map(lap => ({
      ...lap,
      sessionName: sessions.find(s => s.id === lap.sessionId)?.name || 'Unknown',
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
