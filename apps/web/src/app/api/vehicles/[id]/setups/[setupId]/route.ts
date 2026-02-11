import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@purplesector/db-prisma';
import { requireAuthUserId } from '@/lib/api-auth';

// GET /api/vehicles/[id]/setups/[setupId] - Get a specific setup
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; setupId: string } }
) {
  try {
    let userId: string;
    try {
      userId = requireAuthUserId();
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const setup = await (prisma as any).vehicleSetup.findFirst({
      where: { id: params.setupId, vehicleId: params.id, userId },
      include: {
        vehicle: true,
        vehicleConfiguration: true,
        _count: {
          select: { sessions: true },
        },
      },
    });

    if (!setup) {
      return NextResponse.json(
        { error: 'Setup not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(setup);
  } catch (error) {
    console.error('Error fetching setup:', error);
    return NextResponse.json(
      { error: 'Failed to fetch setup' },
      { status: 500 }
    );
  }
}

// PATCH /api/vehicles/[id]/setups/[setupId] - Update a setup
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; setupId: string } }
) {
  try {
    let userId: string;
    try {
      userId = requireAuthUserId();
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, vehicleConfigurationId, parameters } = body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (vehicleConfigurationId !== undefined) updateData.vehicleConfigurationId = vehicleConfigurationId;
    if (parameters !== undefined) updateData.parameters = JSON.stringify(parameters);

    const result = await (prisma as any).vehicleSetup.updateMany({
      where: { id: params.setupId, vehicleId: params.id, userId },
      data: updateData,
    });

    if (!result.count) {
      return NextResponse.json({ error: 'Setup not found' }, { status: 404 });
    }

    const setup = await (prisma as any).vehicleSetup.findFirst({
      where: { id: params.setupId, vehicleId: params.id, userId },
    });
    return NextResponse.json(setup);
  } catch (error) {
    console.error('Error updating setup:', error);
    return NextResponse.json(
      { error: 'Failed to update setup' },
      { status: 500 }
    );
  }
}

// PUT /api/vehicles/[id]/setups/[setupId] - Update a setup (alias for PATCH)
export const PUT = PATCH;

// DELETE /api/vehicles/[id]/setups/[setupId] - Delete a setup
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; setupId: string } }
) {
  try {
    let userId: string;
    try {
      userId = requireAuthUserId();
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await (prisma as any).vehicleSetup.deleteMany({
      where: { id: params.setupId, vehicleId: params.id, userId },
    });

    if (!result.count) {
      return NextResponse.json({ error: 'Setup not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting setup:', error);
    return NextResponse.json(
      { error: 'Failed to delete setup' },
      { status: 500 }
    );
  }
}
