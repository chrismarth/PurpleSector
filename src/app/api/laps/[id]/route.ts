import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const lap = await prisma.lap.findUnique({
      where: { id: params.id },
      include: {
        session: {
          include: {
            event: true,
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
    const body = await request.json();
    const { driverComments, tags, plotConfigs } = body;

    const updateData: any = {};
    if (driverComments !== undefined) updateData.driverComments = driverComments;
    if (tags !== undefined) updateData.tags = tags;
    if (plotConfigs !== undefined) updateData.plotConfigs = plotConfigs;

    const lap = await prisma.lap.update({
      where: { id: params.id },
      data: updateData,
    });

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
    await prisma.lap.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting lap:', error);
    return NextResponse.json(
      { error: 'Failed to delete lap' },
      { status: 500 }
    );
  }
}
