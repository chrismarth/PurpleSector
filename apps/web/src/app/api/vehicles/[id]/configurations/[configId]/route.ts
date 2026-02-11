import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@purplesector/db-prisma';
import { requireAuthUserId } from '@/lib/api-auth';

// GET /api/vehicles/[id]/configurations/[configId] - Get a specific configuration
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; configId: string } }
) {
  try {
    let userId: string;
    try {
      userId = requireAuthUserId();
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const configuration = await (prisma as any).vehicleConfiguration.findFirst({
      where: { id: params.configId, vehicleId: params.id, userId },
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
    let userId: string;
    try {
      userId = requireAuthUserId();
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, parts } = body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (parts !== undefined) updateData.parts = JSON.stringify(parts);

    const result = await (prisma as any).vehicleConfiguration.updateMany({
      where: { id: params.configId, vehicleId: params.id, userId },
      data: updateData,
    });

    if (!result.count) {
      return NextResponse.json({ error: 'Configuration not found' }, { status: 404 });
    }

    const configuration = await (prisma as any).vehicleConfiguration.findFirst({
      where: { id: params.configId, vehicleId: params.id, userId },
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
    let userId: string;
    try {
      userId = requireAuthUserId();
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await (prisma as any).vehicleConfiguration.deleteMany({
      where: { id: params.configId, vehicleId: params.id, userId },
    });

    if (!result.count) {
      return NextResponse.json({ error: 'Configuration not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting configuration:', error);
    return NextResponse.json(
      { error: 'Failed to delete configuration' },
      { status: 500 }
    );
  }
}
