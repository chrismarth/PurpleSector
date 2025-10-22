import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { calculateLapTime, normalizeTelemetryFrames } from '@/lib/utils';

// POST /api/laps - Create a new lap
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, lapNumber, telemetryData } = body;

    if (!sessionId || lapNumber === undefined || !telemetryData) {
      return NextResponse.json(
        { error: 'sessionId, lapNumber, and telemetryData are required' },
        { status: 400 }
      );
    }

    // Parse and normalize telemetry data
    const frames = JSON.parse(telemetryData);
    const normalizedFrames = normalizeTelemetryFrames(frames);
    const lapTime = calculateLapTime(normalizedFrames);
    const normalizedTelemetryData = JSON.stringify(normalizedFrames);

    // Check if lap already exists (prevent duplicates)
    const existingLap = await prisma.lap.findFirst({
      where: {
        sessionId,
        lapNumber,
      },
    });

    if (existingLap) {
      console.log(`Lap ${lapNumber} already exists for session ${sessionId}, skipping duplicate`);
      return NextResponse.json(existingLap, { status: 200 });
    }

    // Verify session exists before creating lap
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      console.error(`Session ${sessionId} not found, cannot create lap`);
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    const lap = await prisma.lap.create({
      data: {
        sessionId,
        lapNumber,
        lapTime,
        telemetryData: normalizedTelemetryData,
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
