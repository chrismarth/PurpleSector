import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@purplesector/db-prisma';
import { requireAuthUserId } from '@/lib/api-auth';

// GET /api/vehicles/[id]/setups - List all setups for a vehicle
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

    const setups = await (prisma as any).vehicleSetup.findMany({
      where: { vehicleId: params.id, userId },
      include: {
        vehicleConfiguration: true,
        _count: {
          select: { sessions: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(setups);
  } catch (error) {
    console.error('Error fetching setups:', error);
    return NextResponse.json(
      { error: 'Failed to fetch setups' },
      { status: 500 }
    );
  }
}

// POST /api/vehicles/[id]/setups - Create a new setup
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
    const { name, description, vehicleConfigurationId, parameters } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const setup = await (prisma as any).vehicleSetup.create({
      data: {
        userId,
        vehicleId: params.id,
        vehicleConfigurationId: vehicleConfigurationId || null,
        name,
        description,
        parameters: parameters ? JSON.stringify(parameters) : JSON.stringify({}),
      },
    });

    return NextResponse.json(setup, { status: 201 });
  } catch (error) {
    console.error('Error creating setup:', error);
    return NextResponse.json(
      { error: 'Failed to create setup' },
      { status: 500 }
    );
  }
}
