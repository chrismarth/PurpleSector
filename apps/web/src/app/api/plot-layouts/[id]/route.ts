import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@purplesector/db-prisma';
import { requireAuthUserId } from '@/lib/api-auth';

// GET /api/plot-layouts/[id] - Get a specific plot layout
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

    const layout = await (prisma as any).savedPlotLayout.findFirst({
      where: { id: params.id, userId },
    });

    if (!layout) {
      return NextResponse.json(
        { error: 'Plot layout not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(layout);
  } catch (error) {
    console.error('Error fetching plot layout:', error);
    return NextResponse.json(
      { error: 'Failed to fetch plot layout' },
      { status: 500 }
    );
  }
}

// DELETE /api/plot-layouts/[id] - Delete a plot layout
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

    const result = await (prisma as any).savedPlotLayout.deleteMany({
      where: { id: params.id, userId },
    });

    if (!result.count) {
      return NextResponse.json({ error: 'Plot layout not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting plot layout:', error);
    return NextResponse.json(
      { error: 'Failed to delete plot layout' },
      { status: 500 }
    );
  }
}

// PATCH /api/plot-layouts/[id] - Update a plot layout
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
    const { name, description, plotConfigs, layout } = body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (plotConfigs !== undefined) updateData.plotConfigs = JSON.stringify(plotConfigs);
    if (layout !== undefined) updateData.layout = JSON.stringify(layout);

    const result = await (prisma as any).savedPlotLayout.updateMany({
      where: { id: params.id, userId },
      data: updateData,
    });

    if (!result.count) {
      return NextResponse.json({ error: 'Plot layout not found' }, { status: 404 });
    }

    const updatedLayout = await (prisma as any).savedPlotLayout.findFirst({ where: { id: params.id, userId } });
    return NextResponse.json(updatedLayout);
  } catch (error) {
    console.error('Error updating plot layout:', error);
    return NextResponse.json(
      { error: 'Failed to update plot layout' },
      { status: 500 }
    );
  }
}
