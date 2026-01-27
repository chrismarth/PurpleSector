import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/analysis-layouts/[id] - Get a specific analysis layout
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const layout = await prisma.savedAnalysisLayout.findUnique({
      where: { id: params.id },
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
    await prisma.savedAnalysisLayout.delete({
      where: { id: params.id },
    });

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
    const body = await request.json();
    const { name, description, layout, context, isDefault } = body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (layout !== undefined) updateData.layout = JSON.stringify(layout);
    if (context !== undefined) updateData.context = context;
    if (isDefault !== undefined) updateData.isDefault = isDefault;

    const updatedLayout = await prisma.savedAnalysisLayout.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json(updatedLayout);
  } catch (error) {
    console.error('Error updating analysis layout:', error);
    return NextResponse.json(
      { error: 'Failed to update analysis layout' },
      { status: 500 },
    );
  }
}
