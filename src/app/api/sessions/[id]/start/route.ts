import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// POST /api/sessions/[id]/start - Start a session (enable telemetry collection)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await prisma.session.update({
      where: { id: params.id },
      data: { started: true },
      include: {
        laps: {
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
