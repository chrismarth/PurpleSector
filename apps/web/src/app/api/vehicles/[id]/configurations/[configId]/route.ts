import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@purplesector/db-prisma';

// GET /api/vehicles/[id]/configurations/[configId] - Get a specific configuration
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; configId: string } }
) {
  try {
    const configuration = await prisma.vehicleConfiguration.findUnique({
      where: { id: params.configId },
      include: {
        vehicle: true,
        setups: {
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: { sessions: true },
        },
      },
    });

    if (!configuration) {
      return NextResponse.json(
        { error: 'Configuration not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(configuration);
  } catch (error) {
    console.error('Error fetching configuration:', error);
    return NextResponse.json(
      { error: 'Failed to fetch configuration' },
      { status: 500 }
    );
  }
}

// PATCH /api/vehicles/[id]/configurations/[configId] - Update a configuration
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; configId: string } }
) {
  try {
    const body = await request.json();
    const { name, description, parts } = body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (parts !== undefined) updateData.parts = JSON.stringify(parts);

    const configuration = await prisma.vehicleConfiguration.update({
      where: { id: params.configId },
      data: updateData,
    });

    return NextResponse.json(configuration);
  } catch (error) {
    console.error('Error updating configuration:', error);
    return NextResponse.json(
      { error: 'Failed to update configuration' },
      { status: 500 }
    );
  }
}

// PUT /api/vehicles/[id]/configurations/[configId] - Update a configuration (alias for PATCH)
export const PUT = PATCH;

// DELETE /api/vehicles/[id]/configurations/[configId] - Delete a configuration
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; configId: string } }
) {
  try {
    await prisma.vehicleConfiguration.delete({
      where: { id: params.configId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting configuration:', error);
    return NextResponse.json(
      { error: 'Failed to delete configuration' },
      { status: 500 }
    );
  }
}
