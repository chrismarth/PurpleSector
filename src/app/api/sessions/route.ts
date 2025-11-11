import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/sessions - List all sessions
export async function GET() {
  try {
    const sessions = await prisma.session.findMany({
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
    const body = await request.json();
    const { eventId, name, source, vehicleId, vehicleConfigurationId, vehicleSetupId, started } = body;

    if (!eventId || !name || !source) {
      return NextResponse.json(
        { error: 'Event ID, name and source are required' },
        { status: 400 }
      );
    }

    const session = await prisma.session.create({
      data: {
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
