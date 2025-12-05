import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@purplesector/db-prisma';

// GET /api/vehicles/[id] - Get a specific vehicle
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: params.id },
      include: {
        configurations: {
          orderBy: { createdAt: 'desc' },
          include: {
            _count: {
              select: { setups: true, sessions: true },
            },
          },
        },
        setups: {
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
    const body = await request.json();
    const { name, description, inServiceDate, outOfServiceDate, tags } = body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (inServiceDate !== undefined) updateData.inServiceDate = inServiceDate ? new Date(inServiceDate) : null;
    if (outOfServiceDate !== undefined) updateData.outOfServiceDate = outOfServiceDate ? new Date(outOfServiceDate) : null;
    if (tags !== undefined) updateData.tags = tags ? JSON.stringify(tags) : null;

    const vehicle = await prisma.vehicle.update({
      where: { id: params.id },
      data: updateData,
    });

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
    await prisma.vehicle.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting vehicle:', error);
    return NextResponse.json(
      { error: 'Failed to delete vehicle' },
      { status: 500 }
    );
  }
}
