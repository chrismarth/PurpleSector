import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@purplesector/db-prisma';
import { requireAuthUserId } from '@/lib/api-auth';

// GET /api/vehicles/[id]/configurations - List all configurations for a vehicle
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

    const vehicle = await (prisma as any).vehicle.findFirst({ where: { id: params.id, userId } });
    if (!vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    const configurations = await (prisma as any).vehicleConfiguration.findMany({
      where: { vehicleId: params.id, userId },
      include: {
        _count: {
          select: { setups: true, sessions: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(configurations);
  } catch (error) {
    console.error('Error fetching configurations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch configurations' },
      { status: 500 }
    );
  }
}

// POST /api/vehicles/[id]/configurations - Create a new configuration
export async function POST(
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

    const vehicle = await (prisma as any).vehicle.findFirst({ where: { id: params.id, userId } });
    if (!vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    const body = await request.json();
    const { name, description, parts } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const configuration = await (prisma as any).vehicleConfiguration.create({
      data: {
        userId,
        vehicleId: params.id,
        name,
        description,
        parts: parts ? JSON.stringify(parts) : JSON.stringify({}),
      },
    });

    return NextResponse.json(configuration, { status: 201 });
  } catch (error) {
    console.error('Error creating configuration:', error);
    return NextResponse.json(
      { error: 'Failed to create configuration' },
      { status: 500 }
    );
  }
}
