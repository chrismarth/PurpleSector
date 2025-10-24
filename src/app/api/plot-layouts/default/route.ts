import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/plot-layouts/default - Get the default layout for a context
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const context = searchParams.get('context') || 'global';

    const defaultLayout = await prisma.savedPlotLayout.findFirst({
      where: {
        context,
        isDefault: true,
      },
    });

    if (!defaultLayout) {
      return NextResponse.json(
        { error: 'No default layout found' },
        { status: 404 }
      );
    }

    return NextResponse.json(defaultLayout);
  } catch (error) {
    console.error('Error fetching default layout:', error);
    return NextResponse.json(
      { error: 'Failed to fetch default layout' },
      { status: 500 }
    );
  }
}

// POST /api/plot-layouts/default - Set a layout as default
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { layoutId, context = 'global' } = body;

    if (!layoutId) {
      return NextResponse.json(
        { error: 'Missing required field: layoutId' },
        { status: 400 }
      );
    }

    // First, unset any existing default for this context
    await prisma.savedPlotLayout.updateMany({
      where: {
        context,
        isDefault: true,
      },
      data: {
        isDefault: false,
      },
    });

    // Then set the new default
    const updatedLayout = await prisma.savedPlotLayout.update({
      where: { id: layoutId },
      data: { isDefault: true },
    });

    return NextResponse.json(updatedLayout);
  } catch (error) {
    console.error('Error setting default layout:', error);
    return NextResponse.json(
      { error: 'Failed to set default layout' },
      { status: 500 }
    );
  }
}
