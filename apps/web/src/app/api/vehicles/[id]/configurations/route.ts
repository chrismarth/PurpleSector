import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@purplesector/db-prisma';

// GET /api/vehicles/[id]/configurations - List all configurations for a vehicle
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const configurations = await prisma.vehicleConfiguration.findMany({
      where: { vehicleId: params.id },
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
    const body = await request.json();
    const { name, description, parts } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const configuration = await prisma.vehicleConfiguration.create({
      data: {
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
