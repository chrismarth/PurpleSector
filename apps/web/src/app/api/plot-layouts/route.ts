import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/plot-layouts - Get all saved plot layouts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const context = searchParams.get('context') || 'global';

    const layouts = await prisma.savedPlotLayout.findMany({
      where: {
        context,
      },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return NextResponse.json(layouts);
  } catch (error) {
    console.error('Error fetching plot layouts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch plot layouts' },
      { status: 500 }
    );
  }
}

// POST /api/plot-layouts - Create a new saved plot layout
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, plotConfigs, layout, context = 'global' } = body;

    if (!name || !plotConfigs || !layout) {
      return NextResponse.json(
        { error: 'Missing required fields: name, plotConfigs, layout' },
        { status: 400 }
      );
    }

    const savedLayout = await prisma.savedPlotLayout.create({
      data: {
        name,
        description,
        plotConfigs: JSON.stringify(plotConfigs),
        layout: JSON.stringify(layout),
        context,
        isDefault: false,
      },
    });

    return NextResponse.json(savedLayout);
  } catch (error) {
    console.error('Error creating plot layout:', error);
    return NextResponse.json(
      { error: 'Failed to create plot layout' },
      { status: 500 }
    );
  }
}
