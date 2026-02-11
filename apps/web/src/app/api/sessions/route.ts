import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@purplesector/db-prisma';
import { requireAuthUserId } from '@/lib/api-auth';

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
    const { eventId, name, source, vehicleId, vehicleConfigurationId, vehicleSetupId, started } = body;

    if (!eventId || !name || !source) {
      return NextResponse.json(
        { error: 'Event ID, name and source are required' },
        { status: 400 }
      );
    }

    const event = await (prisma as any).event.findFirst({ where: { id: eventId, userId } });
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const session = await (prisma as any).session.create({
      data: {
        userId,
        eventId,
        name,
        source,
        status: 'active',
        started: started !== undefined ? started : true, // Default to true for backward compatibility
        vehicleId: vehicleId || null,
        vehicleConfigurationId: vehicleConfigurationId || null,
        vehicleSetupId: vehicleSetupId || null,
      },
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
