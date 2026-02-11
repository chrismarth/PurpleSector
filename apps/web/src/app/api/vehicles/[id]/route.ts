import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@purplesector/db-prisma';
import { requireAuthUserId } from '@/lib/api-auth';

// GET /api/vehicles/[id] - Get a specific vehicle
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

    const vehicle = await (prisma as any).vehicle.findFirst({
      where: { id: params.id, userId },
      include: {
        configurations: {
          where: { userId },
          orderBy: { createdAt: 'desc' },
          include: {
            _count: {
              select: { setups: true, sessions: true },
            },
          },
        },
        setups: {
          where: { userId },
          orderBy: { createdAt: 'desc' },
          include: {
            vehicleConfiguration: true,
            _count: {
              select: { sessions: true },
            },
          },
        },
        _count: {
          select: { sessions: true },
        },
      },
    });

    if (!vehicle) {
      return NextResponse.json(
        { error: 'Vehicle not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(vehicle);
  } catch (error) {
    console.error('Error fetching vehicle:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vehicle' },
      { status: 500 }
    );
  }
}

// PATCH /api/vehicles/[id] - Update a vehicle
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
    const { name, description, inServiceDate, outOfServiceDate, tags } = body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (inServiceDate !== undefined) updateData.inServiceDate = inServiceDate ? new Date(inServiceDate) : null;
    if (outOfServiceDate !== undefined) updateData.outOfServiceDate = outOfServiceDate ? new Date(outOfServiceDate) : null;
    if (tags !== undefined) updateData.tags = tags ? JSON.stringify(tags) : null;

    const result = await (prisma as any).vehicle.updateMany({
      where: { id: params.id, userId },
      data: updateData,
    });

    if (!result.count) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    const vehicle = await (prisma as any).vehicle.findFirst({ where: { id: params.id, userId } });
    return NextResponse.json(vehicle);
  } catch (error) {
    console.error('Error updating vehicle:', error);
    return NextResponse.json(
      { error: 'Failed to update vehicle' },
      { status: 500 }
    );
  }
}

// PUT /api/vehicles/[id] - Update a vehicle (alias for PATCH)
export const PUT = PATCH;

// DELETE /api/vehicles/[id] - Delete a vehicle
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

    const result = await (prisma as any).vehicle.deleteMany({
      where: { id: params.id, userId },
    });

    if (!result.count) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting vehicle:', error);
    return NextResponse.json(
      { error: 'Failed to delete vehicle' },
      { status: 500 }
    );
  }
}
