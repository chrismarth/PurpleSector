import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@purplesector/db-prisma';
import { requireAuthUserId } from '@/lib/auth';
import type { EventSummary, Event as EventDTO, SessionSummary } from '@/types/core';

// GET /api/events/[id] - Get a specific event
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

    const url = new URL(request.url);
    const includeParam = url.searchParams.get('include');
    const includeSessions = includeParam === 'sessions';

    if (includeSessions) {
      const row = await prisma.event.findFirst({
        where: { id: params.id, userId },
        include: {
          sessions: {
            where: { userId },
            orderBy: { createdAt: 'asc' },
            include: { _count: { select: { laps: true } } },
          },
        },
      });

      if (!row) {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 });
      }

      const dto: EventDTO = {
        id: row.id,
        name: row.name,
        description: row.description,
        location: row.location,
        startDate: row.startDate?.toISOString() ?? null,
        endDate: row.endDate?.toISOString() ?? null,
        createdAt: row.createdAt.toISOString(),
        sessions: row.sessions.map((s): SessionSummary => ({
          id: s.id,
          eventId: s.eventId,
          name: s.name,
          source: s.source,
          status: s.status,
          started: s.started,
          tags: s.tags,
          createdAt: s.createdAt.toISOString(),
          lapCount: s._count.laps,
        })),
      };
      return NextResponse.json(dto);
    }

    const row = await prisma.event.findFirst({
      where: { id: params.id, userId },
    });

    if (!row) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const dto: EventSummary = {
      id: row.id,
      name: row.name,
      description: row.description,
      location: row.location,
      startDate: row.startDate?.toISOString() ?? null,
      endDate: row.endDate?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    };
    return NextResponse.json(dto);
  } catch (error) {
    console.error('Error fetching event:', error);
    return NextResponse.json(
      { error: 'Failed to fetch event' },
      { status: 500 }
    );
  }
}

// PATCH /api/events/[id] - Update an event
export async function PATCH(
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

    const body = await request.json();
    const { name, description, location, startDate, endDate } = body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (location !== undefined) updateData.location = location;
    if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null;
    if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;

    const result = await prisma.event.updateMany({
      where: { id: params.id, userId },
      data: updateData,
    });

    if (!result.count) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const row = await prisma.event.findFirst({ where: { id: params.id, userId } });
    if (!row) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    const dto: EventSummary = {
      id: row.id,
      name: row.name,
      description: row.description,
      location: row.location,
      startDate: row.startDate?.toISOString() ?? null,
      endDate: row.endDate?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    };
    return NextResponse.json(dto);
  } catch (error) {
    console.error('Error updating event:', error);
    return NextResponse.json(
      { error: 'Failed to update event' },
      { status: 500 }
    );
  }
}

// PUT /api/events/[id] - Update an event (alias for PATCH)
export const PUT = PATCH;

// DELETE /api/events/[id] - Delete an event
export async function DELETE(
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

    const result = await prisma.event.deleteMany({
      where: { id: params.id, userId },
    });

    if (!result.count) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting event:', error);
    return NextResponse.json(
      { error: 'Failed to delete event' },
      { status: 500 }
    );
  }
}
