import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@purplesector/db-prisma';
import { requireAuthUserId } from '@/lib/api-auth';

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
    const deep = includeParam === 'sessions.laps';

    const events = await (prisma as any).event.findMany({
      where: { userId },
      include: deep
        ? {
            sessions: {
              where: { userId },
              orderBy: { createdAt: 'desc' },
              include: {
                laps: {
                  orderBy: { lapNumber: 'asc' },
                  select: { id: true, lapNumber: true, lapTime: true },
                },
              },
            },
            _count: { select: { sessions: true } },
          }
        : {
            _count: { select: { sessions: true } },
          },
      orderBy: {
        createdAt: 'desc',
      },
    });

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

    const event = await (prisma as any).event.create({
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
