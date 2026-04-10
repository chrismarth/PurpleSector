import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@purplesector/db-prisma';
import { requireAuthUserId } from '@/lib/auth';
import type { EventSummary, Event as EventDTO, SessionSummary } from '@/types/core';

// GET /api/events - List all events
export async function GET(request: NextRequest) {
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
      const rows = await prisma.event.findMany({
        where: { userId },
        include: {
          sessions: {
            where: { userId },
            orderBy: { createdAt: 'desc' },
            include: { _count: { select: { laps: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const events: EventDTO[] = rows.map((e) => ({
        id: e.id,
        name: e.name,
        description: e.description,
        location: e.location,
        startDate: e.startDate?.toISOString() ?? null,
        endDate: e.endDate?.toISOString() ?? null,
        createdAt: e.createdAt.toISOString(),
        sessions: e.sessions.map((s): SessionSummary => ({
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
      }));
      return NextResponse.json(events);
    }

    const rows = await prisma.event.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    const events: EventSummary[] = rows.map((e) => ({
      id: e.id,
      name: e.name,
      description: e.description,
      location: e.location,
      startDate: e.startDate?.toISOString() ?? null,
      endDate: e.endDate?.toISOString() ?? null,
      createdAt: e.createdAt.toISOString(),
    }));
    return NextResponse.json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}

// POST /api/events - Create a new event
export async function POST(request: NextRequest) {
  try {
    let userId: string;
    try {
      userId = requireAuthUserId();
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();
    const { name, description, location, startDate, endDate } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const event = await prisma.event.create({
      data: {
        userId,
        name,
        description,
        location,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
      },
    });

    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    console.error('Error creating event:', error);
    return NextResponse.json(
      { error: 'Failed to create event' },
      { status: 500 }
    );
  }
}
