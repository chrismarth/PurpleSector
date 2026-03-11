import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@purplesector/db-prisma';
import { calculateLapTime, normalizeTelemetryFrames } from '@/lib/utils';
import { requireAuthUserId } from '@/lib/api-auth';

// POST /api/laps - Create a new lap
export async function POST(request: NextRequest) {
  try {
    let userId: string;
    try {
      userId = requireAuthUserId();
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { sessionId, lapNumber, telemetryData } = body;

    if (!sessionId || lapNumber === undefined || !telemetryData) {
      return NextResponse.json(
        { error: 'sessionId, lapNumber, and telemetryData are required' },
        { status: 400 }
      );
    }

    // Parse and normalize telemetry data to calculate lap time
    // Note: Telemetry data is NOT stored in PostgreSQL
    // It flows through Redpanda → RisingWave → Iceberg and is queried via Trino
    const frames = JSON.parse(telemetryData);
    const normalizedFrames = normalizeTelemetryFrames(frames);
    const lapTime = calculateLapTime(normalizedFrames);

    // Check if lap already exists (prevent duplicates)
    const existingLap = await (prisma as any).lap.findFirst({
      where: {
        userId,
        sessionId,
        lapNumber,
      },
    });

    if (existingLap) {
      console.log(`Lap ${lapNumber} already exists for session ${sessionId}, skipping duplicate`);
      return NextResponse.json(existingLap, { status: 200 });
    }

    // Verify session exists before creating lap
    const session = await (prisma as any).session.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      console.error(`Session ${sessionId} not found, cannot create lap`);
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Create lap metadata only - telemetry data is stored in Iceberg
    const lap = await (prisma as any).lap.create({
      data: {
        userId,
        sessionId,
        lapNumber,
        lapTime,
        analyzed: false,
      },
    });

    return NextResponse.json(lap, { status: 201 });
  } catch (error) {
    console.error('Error creating lap:', error);
    return NextResponse.json(
      { error: 'Failed to create lap' },
      { status: 500 }
    );
  }
}
