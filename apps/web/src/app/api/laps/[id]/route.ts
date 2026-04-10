import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@purplesector/db-prisma';
import { requireAuthUserId } from '@/lib/auth';
import { requireCanReadSessionById } from '@/lib/access-control';
import type { Lap as LapDTO, SessionSummary, ChatMessage } from '@/types/core';

function toLapDTO(row: any): LapDTO {
  const dto: LapDTO = {
    id: row.id,
    sessionId: row.sessionId,
    lapNumber: row.lapNumber,
    lapTime: row.lapTime,
    analyzed: row.analyzed,
    tags: row.tags,
    driverComments: row.driverComments,
    suggestions: row.suggestions,
    plotConfigs: row.plotConfigs ?? null,
  };
  if (row.session) {
    dto.session = {
      id: row.session.id,
      eventId: row.session.eventId,
      name: row.session.name,
      source: row.session.source,
      status: row.session.status,
      started: row.session.started,
      tags: row.session.tags,
      createdAt: row.session.createdAt instanceof Date ? row.session.createdAt.toISOString() : row.session.createdAt,
      lapCount: row.session._count?.laps ?? 0,
    } as SessionSummary;
  }
  if (row.chatMessages) {
    dto.chatMessages = row.chatMessages.map((m: any): ChatMessage => ({
      id: m.id,
      role: m.role,
      content: m.content,
      createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : m.createdAt,
    }));
  }
  return dto;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    let userId: string;
    try {
      userId = requireAuthUserId();
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const lapMeta = await prisma.lap.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        sessionId: true,
      },
    });

    if (!lapMeta) {
      return NextResponse.json({ error: 'Lap not found' }, { status: 404 });
    }

    await requireCanReadSessionById({
      requesterUserId: userId,
      sessionId: lapMeta.sessionId,
    });

    const lap = await prisma.lap.findFirst({
      where: { id: params.id },
      include: {
        session: {
          include: { _count: { select: { laps: true } } },
        },
        chatMessages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!lap) {
      return NextResponse.json({ error: 'Lap not found' }, { status: 404 });
    }

    return NextResponse.json(toLapDTO(lap));
  } catch (error) {
    if ((error as any)?.code === 'NOT_FOUND') {
      return NextResponse.json({ error: 'Lap not found' }, { status: 404 });
    }
    if ((error as any)?.code === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Error fetching lap:', error);
    return NextResponse.json({ error: 'Failed to fetch lap' }, { status: 500 });
  }
}

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

    // Verify the lap exists and the caller has write access via its session.
    const lapMeta = await prisma.lap.findFirst({
      where: { id: params.id },
      select: { id: true, sessionId: true },
    });

    if (!lapMeta) {
      return NextResponse.json({ error: 'Lap not found' }, { status: 404 });
    }

    await requireCanReadSessionById({
      requesterUserId: userId,
      sessionId: lapMeta.sessionId,
    });

    const body = await request.json();
    const { driverComments, tags, plotConfigs } = body;

    const updateData: any = {};
    if (driverComments !== undefined) updateData.driverComments = driverComments;
    if (tags !== undefined) updateData.tags = tags;
    if (plotConfigs !== undefined) updateData.plotConfigs = plotConfigs;

    // `id` is @unique on Lap, so update by id directly.
    const lap = await prisma.lap.update({
      where: { id: params.id },
      data: updateData,
      include: {
        session: {
          include: { _count: { select: { laps: true } } },
        },
        chatMessages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    return NextResponse.json(toLapDTO(lap));
  } catch (error) {
    if ((error as any)?.code === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Error updating lap:', error);
    return NextResponse.json({ error: 'Failed to update lap' }, { status: 500 });
  }
}

// DELETE /api/laps/[id] - Delete a lap
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    let userId: string;
    try {
      userId = requireAuthUserId();
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const lapMeta = await prisma.lap.findFirst({
      where: { id: params.id },
      select: { id: true, sessionId: true },
    });

    if (!lapMeta) {
      return NextResponse.json({ error: 'Lap not found' }, { status: 404 });
    }

    await requireCanReadSessionById({
      requesterUserId: userId,
      sessionId: lapMeta.sessionId,
    });

    await prisma.lap.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    if ((error as any)?.code === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Error deleting lap:', error);
    return NextResponse.json({ error: 'Failed to delete lap' }, { status: 500 });
  }
}
