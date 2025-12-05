import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@purplesector/db-prisma';

// GET /api/vehicles/[id]/setups - List all setups for a vehicle
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const setups = await prisma.vehicleSetup.findMany({
      where: { vehicleId: params.id },
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
    const body = await request.json();
    const { name, description, vehicleConfigurationId, parameters } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const setup = await prisma.vehicleSetup.create({
      data: {
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
