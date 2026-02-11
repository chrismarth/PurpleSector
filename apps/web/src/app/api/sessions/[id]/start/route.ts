import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@purplesector/db-prisma';
import { requireAuthUserId } from '@/lib/api-auth';

// POST /api/sessions/[id]/start - Start a session (enable telemetry collection)
export async function POST(
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

    const result = await (prisma as any).session.updateMany({
      where: { id: params.id, userId },
      data: { started: true },
    });

    if (!result.count) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const session = await (prisma as any).session.findFirst({
      where: { id: params.id, userId },
      include: {
        laps: {
          where: { userId },
          orderBy: { lapNumber: 'asc' },
        },
        event: {
          select: { name: true },
        },
      },
    });

    return NextResponse.json(session);
  } catch (error) {
    console.error('Error starting session:', error);
    return NextResponse.json(
      { error: 'Failed to start session' },
      { status: 500 }
    );
  }
}
