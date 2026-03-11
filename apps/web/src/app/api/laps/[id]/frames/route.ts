import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@purplesector/db-prisma';
import { requireAuthUserId } from '@/lib/api-auth';
import { getLapFramesFromIceberg, isTrinoAvailable } from '@/lib/trino';

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

    const lap = await (prisma as any).lap.findFirst({
      where: { id: params.id, userId },
      select: {
        id: true,
        sessionId: true,
        lapNumber: true,
        userId: true,
      },
    });

    if (!lap) {
      return NextResponse.json({ error: 'Lap not found' }, { status: 404 });
    }

    const trinoAvailable = await isTrinoAvailable();
    
    if (!trinoAvailable) {
      return NextResponse.json(
        { error: 'Telemetry data storage unavailable' },
        { status: 503 }
      );
    }

    const frames = await getLapFramesFromIceberg(
      lap.userId,
      lap.sessionId,
      lap.lapNumber
    );

    if (frames.length === 0) {
      return NextResponse.json(
        { error: 'No telemetry data found for this lap' },
        { status: 404 }
      );
    }

    return NextResponse.json({ frames });
  } catch (error) {
    console.error('Error fetching lap frames from Iceberg:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lap frames' },
      { status: 500 }
    );
  }
}
