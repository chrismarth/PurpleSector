import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@purplesector/db-prisma';
import { requireAuthUserId } from '@/lib/api-auth';
import { registerActiveSession } from '@/lib/risingwave';

// GET /api/sessions - List all sessions
export async function GET() {
  try {
    let userId: string;
    try {
      userId = requireAuthUserId();
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sessions = await (prisma as any).session.findMany({
      where: { userId },
      include: {
        _count: {
          select: { laps: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(sessions);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
}

// POST /api/sessions - Create a new session
export async function POST(request: NextRequest) {
  try {
    let userId: string;
    try {
      userId = requireAuthUserId();
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    console.log('Session creation request body:', body);
    const { eventId, name, source, vehicleId, vehicleConfigurationId, vehicleSetupId, started } = body;

    console.log('Parsed session data:', { eventId, name, source, vehicleId, vehicleConfigurationId, vehicleSetupId, started });

    if (!eventId || !name || !source) {
      console.log('Session creation failed: missing required fields', { eventId: !!eventId, name: !!name, source: !!source });
      return NextResponse.json(
        { error: 'Event ID, name and source are required' },
        { status: 400 }
      );
    }

    const event = await (prisma as any).event.findFirst({ where: { id: eventId, userId } });
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const sessionData = {
      userId,
      eventId,
      name,
      source,
      status: 'active',
      started: started !== undefined ? started : true, // Default to true for backward compatibility
      vehicleId: vehicleId || null,
      vehicleConfigurationId: vehicleConfigurationId || null,
      vehicleSetupId: vehicleSetupId || null,
    };
    console.log('Creating session with data:', sessionData);

    const session = await (prisma as any).session.create({
      data: sessionData,
    });

    console.log('Session created successfully:', { id: session.id, name: session.name, source: session.source });

    // Register session in RisingWave for telemetry assignment.
    // With the 30s watermark on telemetry_frames, state is bounded and
    // the DELETE+INSERT should complete in seconds, not minutes.
    // Fire-and-forget: don't block the API response.
    registerActiveSession({
      sessionId: session.id,
      userId: session.userId,
      source: session.source,
      status: session.status,
    }).catch((err) => {
      console.error('[risingwave] Background session registration failed:', err);
    });

    return NextResponse.json(session, { status: 201 });
  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    );
  }
}
