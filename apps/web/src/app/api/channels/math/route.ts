import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@purplesector/db-prisma';
import { MathTelemetryChannel, MathChannelInput } from '@purplesector/telemetry';
import { requireAuthUserId } from '@/lib/api-auth';

// Color palette for math channels (visible on dark themes)
const MATH_CHANNEL_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ec4899', // pink
  '#8b5cf6', // purple
  '#06b6d4', // cyan
  '#f97316', // orange
  '#14b8a6', // teal
];

function getMathChannelColor(index: number): string {
  return MATH_CHANNEL_COLORS[index % MATH_CHANNEL_COLORS.length];
}

// GET /api/channels/math - List all math channels
export async function GET() {
  try {
    let userId: string;
    try {
      userId = requireAuthUserId();
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const mathChannels = await (prisma as any).mathChannel.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    // Convert DB records to MathTelemetryChannel format
    const channels: MathTelemetryChannel[] = (mathChannels as any[]).map((ch: any, index: number) => ({
      id: ch.id,
      label: ch.label,
      unit: ch.unit,
      kind: 'math',
      isTimeAxis: false,
      expression: ch.expression,
      inputs: JSON.parse(ch.inputs) as MathChannelInput[],
      validated: ch.validated,
      comment: ch.comment ?? undefined,
      defaultColor: getMathChannelColor(index),
    }));

    return NextResponse.json(channels);
  } catch (error) {
    console.error('Error fetching math channels:', error);
    return NextResponse.json(
      { error: 'Failed to fetch math channels' },
      { status: 500 }
    );
  }
}

// POST /api/channels/math - Create a new math channel
export async function POST(request: NextRequest) {
  try {
    let userId: string;
    try {
      userId = requireAuthUserId();
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { label, unit, expression, inputs, validated, comment } = body;

    if (!label || !expression || !inputs) {
      return NextResponse.json(
        { error: 'Missing required fields: label, expression, inputs' },
        { status: 400 }
      );
    }

    const mathChannel = await (prisma as any).mathChannel.create({
      data: {
        userId,
        label,
        unit: unit || '',
        expression,
        inputs: JSON.stringify(inputs),
        validated: validated ?? false,
        comment: comment || null,
      },
    });

    // Get the count of existing channels to determine color
    const existingCount = await (prisma as any).mathChannel.count({ where: { userId } });
    
    const channel: MathTelemetryChannel = {
      id: mathChannel.id,
      label: mathChannel.label,
      unit: mathChannel.unit,
      kind: 'math',
      isTimeAxis: false,
      expression: mathChannel.expression,
      inputs: JSON.parse(mathChannel.inputs) as MathChannelInput[],
      validated: mathChannel.validated,
      comment: mathChannel.comment ?? undefined,
      defaultColor: getMathChannelColor(existingCount - 1),
    };

    return NextResponse.json(channel, { status: 201 });
  } catch (error: any) {
    console.error('Error creating math channel:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      { error: 'Failed to create math channel', details: error.message },
      { status: 500 }
    );
  }
}
