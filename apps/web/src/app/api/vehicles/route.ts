import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@purplesector/db-prisma';

// GET /api/vehicles - List all vehicles
export async function GET() {
  try {
    const vehicles = await prisma.vehicle.findMany({
      include: {
        _count: {
          select: { 
            configurations: true,
            setups: true,
            sessions: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(vehicles);
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vehicles' },
      { status: 500 }
    );
  }
}

// POST /api/vehicles - Create a new vehicle
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, inServiceDate, outOfServiceDate, tags } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const vehicle = await prisma.vehicle.create({
      data: {
        name,
        description,
        inServiceDate: inServiceDate ? new Date(inServiceDate) : null,
        outOfServiceDate: outOfServiceDate ? new Date(outOfServiceDate) : null,
        tags: tags ? JSON.stringify(tags) : null,
      },
    });

    return NextResponse.json(vehicle, { status: 201 });
  } catch (error) {
    console.error('Error creating vehicle:', error);
    return NextResponse.json(
      { error: 'Failed to create vehicle' },
      { status: 500 }
    );
  }
}
