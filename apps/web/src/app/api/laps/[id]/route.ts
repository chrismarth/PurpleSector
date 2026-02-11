import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@purplesector/db-prisma';
import { requireAuthUserId } from '@/lib/api-auth';

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

    const lap = await (prisma as any).lap.findFirst({
      where: { id: params.id, userId },
      include: {
        session: {
          include: {
            event: true,
            vehicle: true,
            vehicleConfiguration: true,
            vehicleSetup: true,
          },
        },
        chatMessages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!lap) {
      return NextResponse.json({ error: 'Lap not found' }, { status: 404 });
    }

    return NextResponse.json(lap);
  } catch (error) {
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

    const body = await request.json();
    const { driverComments, tags, plotConfigs } = body;

    const updateData: any = {};
    if (driverComments !== undefined) updateData.driverComments = driverComments;
    if (tags !== undefined) updateData.tags = tags;
    if (plotConfigs !== undefined) updateData.plotConfigs = plotConfigs;

    const result = await (prisma as any).lap.updateMany({
      where: { id: params.id, userId },
      data: updateData,
    });

    if (!result.count) {
      return NextResponse.json({ error: 'Lap not found' }, { status: 404 });
    }

    const lap = await (prisma as any).lap.findFirst({ where: { id: params.id, userId } });
    return NextResponse.json(lap);
  } catch (error) {
    console.error('Error updating lap:', error);
    return NextResponse.json({ error: 'Failed to update lap' }, { status: 500 });
  }
}

// DELETE /api/laps/[id] - Delete a lap
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

    const result = await (prisma as any).lap.deleteMany({
      where: { id: params.id, userId },
    });

    if (!result.count) {
      return NextResponse.json({ error: 'Lap not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting lap:', error);
    return NextResponse.json(
      { error: 'Failed to delete lap' },
      { status: 500 }
    );
  }
}
