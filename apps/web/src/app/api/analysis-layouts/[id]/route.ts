import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@purplesector/db-prisma';
import { requireAuthUserId } from '@/lib/api-auth';

// GET /api/analysis-layouts/[id] - Get a specific analysis layout
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    let userId: string;
    try {
      userId = requireAuthUserId();
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const layout = await (prisma as any).savedAnalysisLayout.findFirst({
      where: { id: params.id, userId },
    });

    if (!layout) {
      return NextResponse.json(
        { error: 'Analysis layout not found' },
        { status: 404 },
      );
    }

    return NextResponse.json(layout);
  } catch (error) {
    console.error('Error fetching analysis layout:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analysis layout' },
      { status: 500 },
    );
  }
}

// DELETE /api/analysis-layouts/[id] - Delete an analysis layout
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    let userId: string;
    try {
      userId = requireAuthUserId();
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await (prisma as any).savedAnalysisLayout.deleteMany({
      where: { id: params.id, userId },
    });

    if (!result.count) {
      return NextResponse.json({ error: 'Analysis layout not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting analysis layout:', error);
    return NextResponse.json(
      { error: 'Failed to delete analysis layout' },
      { status: 500 },
    );
  }
}

// PATCH /api/analysis-layouts/[id] - Update an analysis layout
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    let userId: string;
    try {
      userId = requireAuthUserId();
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, layout, context, isDefault } = body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (layout !== undefined) updateData.layout = JSON.stringify(layout);
    if (context !== undefined) updateData.context = context;
    if (isDefault !== undefined) updateData.isDefault = isDefault;

    const result = await (prisma as any).savedAnalysisLayout.updateMany({
      where: { id: params.id, userId },
      data: updateData,
    });

    if (!result.count) {
      return NextResponse.json({ error: 'Analysis layout not found' }, { status: 404 });
    }

    const updatedLayout = await (prisma as any).savedAnalysisLayout.findFirst({ where: { id: params.id, userId } });
    return NextResponse.json(updatedLayout);
  } catch (error) {
    console.error('Error updating analysis layout:', error);
    return NextResponse.json(
      { error: 'Failed to update analysis layout' },
      { status: 500 },
    );
  }
}
