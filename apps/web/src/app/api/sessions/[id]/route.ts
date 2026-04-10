import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@purplesector/db-prisma';
import { requireAuthUserId } from '@/lib/auth';
import { updateActiveSessionStatus, deleteActiveSession, snapshotCompletedLaps, snapshotInProgressLap } from '@/lib/risingwave';
import { requireCanReadSessionById } from '@/lib/access-control';
import type { Session as SessionDTO, EventSummary } from '@/types/core';

function toSessionDTO(s: any): SessionDTO {
  const dto: SessionDTO = {
    id: s.id,
    eventId: s.eventId,
    name: s.name,
    source: s.source,
    status: s.status,
    started: s.started,
    tags: s.tags,
    plotConfigs: s.plotConfigs ?? null,
    createdAt: s.createdAt instanceof Date ? s.createdAt.toISOString() : s.createdAt,
    lapCount: s._count?.laps ?? 0,
  };
  if (s.event) {
    dto.event = {
      id: s.event.id,
      name: s.event.name,
      description: s.event.description,
      location: s.event.location,
      startDate: s.event.startDate?.toISOString?.() ?? s.event.startDate ?? null,
      endDate: s.event.endDate?.toISOString?.() ?? s.event.endDate ?? null,
      createdAt: s.event.createdAt instanceof Date ? s.event.createdAt.toISOString() : s.event.createdAt,
    } as EventSummary;
  }
  if (s.vehicle) dto.vehicle = { id: s.vehicle.id, name: s.vehicle.name, description: s.vehicle.description };
  if (s.vehicleConfiguration) dto.vehicleConfiguration = { id: s.vehicleConfiguration.id, name: s.vehicleConfiguration.name, description: s.vehicleConfiguration.description, parts: s.vehicleConfiguration.parts };
  if (s.vehicleSetup) dto.vehicleSetup = { id: s.vehicleSetup.id, name: s.vehicleSetup.name, description: s.vehicleSetup.description, parameters: s.vehicleSetup.parameters };
  return dto;
}

// GET /api/sessions/[id] - Get a specific session
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

    await requireCanReadSessionById({
      requesterUserId: userId,
      sessionId: params.id,
    });

    const row = await prisma.session.findFirst({
      where: { id: params.id },
      include: {
        event: true,
        vehicle: true,
        vehicleConfiguration: true,
        vehicleSetup: true,
        _count: { select: { laps: true } },
      },
    });

    if (!row) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(toSessionDTO(row));
  } catch (error) {
    if ((error as any)?.code === 'NOT_FOUND') {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    if ((error as any)?.code === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Error fetching session:', error);
    return NextResponse.json(
      { error: 'Failed to fetch session' },
      { status: 500 }
    );
  }
}

// PATCH /api/sessions/[id] - Update a session
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
    const { name, status, tags, plotConfigs } = body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (status !== undefined) updateData.status = status;
    if (tags !== undefined) updateData.tags = tags;
    if (plotConfigs !== undefined) updateData.plotConfigs = plotConfigs;

    const result = await prisma.session.updateMany({
      where: { id: params.id, userId },
      data: updateData,
    });

    if (!result.count) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const session = await prisma.session.findFirst({
      where: { id: params.id, userId },
      include: {
        event: true,
        vehicle: true,
        vehicleConfiguration: true,
        vehicleSetup: true,
        _count: { select: { laps: true } },
      },
    });

    // Sync session status to RisingWave.  The streaming MV filters on
    // s.status = 'active', so this is what actually stops lap accumulation.
    // For archival the update is intentionally delayed (see below).
    if (status !== undefined) {
      if (status === 'archived') {
        const sessionId = params.id;
        // Run entirely in the background — response is not delayed.
        // Correct order: snapshot data while session is still active in RisingWave,
        // THEN update status (which retracts the session from the streaming MVs).
        (async () => {
          const [completedLaps, inProgressLap] = await Promise.all([
            snapshotCompletedLaps(sessionId),
            snapshotInProgressLap(sessionId),
          ]);

          // Allow the RisingWave pipeline to drain remaining frames to the
          // Iceberg sink before cutting off the session.  The streaming MV
          // filters on s.status = 'active'; changing the status immediately
          // would drop frames still in transit (Redpanda → RisingWave),
          // causing ~5 s of telemetry at the end of each lap to be lost.
          await new Promise((resolve) => setTimeout(resolve, 10_000));

          // Now safe to remove session from active join.
          await updateActiveSessionStatus(sessionId, 'archived').catch((err) =>
            console.error('[risingwave] Status sync failed:', err)
          );

          // Merge completed laps + the partial last lap (if not already present).
          const allLaps = [...completedLaps];
          if (
            inProgressLap &&
            !completedLaps.some((l) => l.lapNumber === inProgressLap.lapNumber)
          ) {
            allLaps.push(inProgressLap);
          }

          if (allLaps.length === 0) return;

          await Promise.all(
            allLaps.map(async (lap) => {
              const existing = await prisma.lap.findFirst({
                where: { sessionId, lapNumber: lap.lapNumber },
                select: { id: true },
              });
              if (existing) {
                await prisma.lap.update({
                  where: { id: existing.id },
                  data: { lapTime: lap.lapTime },
                });
              } else {
                await prisma.lap.create({
                  data: { sessionId, lapNumber: lap.lapNumber, lapTime: lap.lapTime },
                });
              }
            })
          );
          console.log(`[session] Snapshotted ${allLaps.length} laps for session ${sessionId}`);
        })().catch((err) => console.error('[session] Background lap snapshot failed:', err));
      } else {
        updateActiveSessionStatus(params.id, status).catch((err) =>
          console.error('[risingwave] Background status sync failed:', err)
        );
      }
    }

    return NextResponse.json(session ? toSessionDTO(session) : null);
  } catch (error) {
    console.error('Error updating session:', error);
    return NextResponse.json(
      { error: 'Failed to update session' },
      { status: 500 }
    );
  }
}

// PUT /api/sessions/[id] - Update a session (alias for PATCH)
export const PUT = PATCH;

// DELETE /api/sessions/[id] - Delete a session
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

    // Verify session exists and belongs to this user before deleting.
    const sessionCheck = await prisma.session.findFirst({
      where: { id: params.id, userId },
      select: { id: true },
    });

    if (!sessionCheck) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    await prisma.session.delete({ where: { id: params.id } });

    // Remove session from RisingWave
    await deleteActiveSession(params.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting session:', error);
    return NextResponse.json(
      { error: 'Failed to delete session' },
      { status: 500 }
    );
  }
}
