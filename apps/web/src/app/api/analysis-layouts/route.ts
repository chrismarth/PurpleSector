import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/analysis-layouts - Get all saved analysis layouts (optionally filtered by context)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const context = searchParams.get('context');

    const layouts = await prisma.savedAnalysisLayout.findMany({
      where: context ? { context } : undefined,
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return NextResponse.json(layouts);
  } catch (error) {
    console.error('Error fetching analysis layouts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analysis layouts' },
      { status: 500 },
    );
  }
}

// POST /api/analysis-layouts - Create a new saved analysis layout
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, layout, context = 'global', isDefault = false } = body;

    if (!name || !layout) {
      return NextResponse.json(
        { error: 'Missing required fields: name, layout' },
        { status: 400 },
      );
    }

    const savedLayout = await prisma.savedAnalysisLayout.create({
      data: {
        name,
        description,
        layout: JSON.stringify(layout),
        context,
        isDefault,
      },
    });

    return NextResponse.json(savedLayout);
  } catch (error) {
    console.error('Error creating analysis layout:', error);
    return NextResponse.json(
      { error: 'Failed to create analysis layout' },
      { status: 500 },
    );
  }
}
