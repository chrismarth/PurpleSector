import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@purplesector/db-prisma';
import { requireAuthUserId } from '@/lib/api-auth';
import { DEFAULT_PLOT_CONFIGS, generateDefaultLayout } from '@/types/plotConfig';

const GLOBAL_DEFAULT_USER_ID = '__global__';

// GET /api/plot-layouts/default - Get the default layout for a context
export async function GET(request: NextRequest) {
  try {
    let userId: string;
    try {
      userId = requireAuthUserId();
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const context = searchParams.get('context') || 'global';

    const defaultLayout = await (prisma as any).savedPlotLayout.findFirst({
      where: {
        userId,
        context,
        isDefault: true,
      },
    });

    if (defaultLayout) {
      return NextResponse.json(defaultLayout);
    }

    const globalDefaultLayout = await (prisma as any).savedPlotLayout.findFirst({
      where: {
        userId: GLOBAL_DEFAULT_USER_ID,
        context,
        isDefault: true,
      },
    });

    if (globalDefaultLayout) {
      return NextResponse.json(globalDefaultLayout);
    }

    // Built-in fallback: create a global default layout if none exists.
    const plotConfigs = DEFAULT_PLOT_CONFIGS;
    const layout = generateDefaultLayout(plotConfigs);
    const created = await (prisma as any).savedPlotLayout.create({
      data: {
        userId: GLOBAL_DEFAULT_USER_ID,
        name: `Default ${context} Layout`,
        description: 'Built-in default layout',
        plotConfigs: JSON.stringify(plotConfigs),
        layout: JSON.stringify(layout),
        context,
        isDefault: true,
      },
    });

    return NextResponse.json(created);
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
    let userId: string;
    try {
      userId = requireAuthUserId();
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { layoutId, context = 'global' } = body;

    if (!layoutId) {
      return NextResponse.json(
        { error: 'Missing required field: layoutId' },
        { status: 400 }
      );
    }

    // First, unset any existing default for this context
    await (prisma as any).savedPlotLayout.updateMany({
      where: {
        userId,
        context,
        isDefault: true,
      },
      data: {
        isDefault: false,
      },
    });

    // Then set the new default
    const result = await (prisma as any).savedPlotLayout.updateMany({
      where: { id: layoutId, userId, context },
      data: { isDefault: true },
    });

    if (!result.count) {
      return NextResponse.json({ error: 'Plot layout not found' }, { status: 404 });
    }

    const updatedLayout = await (prisma as any).savedPlotLayout.findFirst({ where: { id: layoutId, userId } });

    return NextResponse.json(updatedLayout);
  } catch (error) {
    console.error('Error setting default layout:', error);
    return NextResponse.json(
      { error: 'Failed to set default layout' },
      { status: 500 }
    );
  }
}
