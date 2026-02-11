import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@purplesector/db-prisma';
import { MathTelemetryChannel, MathChannelInput } from '@purplesector/telemetry';
import { requireAuthUserId } from '@/lib/api-auth';

// PUT /api/channels/math/[id] - Update a math channel
export async function PUT(
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

    const { id } = params;
    const body = await request.json();
    const { label, unit, expression, inputs, validated, comment } = body;

    if (!label || !expression || !inputs) {
      return NextResponse.json(
        { error: 'Missing required fields: label, expression, inputs' },
        { status: 400 }
      );
    }

    const updateResult = await (prisma as any).mathChannel.updateMany({
      where: { id, userId },
      data: {
        label,
        unit: unit || '',
        expression,
        inputs: JSON.stringify(inputs),
        validated: validated ?? false,
        comment: comment || null,
      },
    });

    if (!updateResult.count) {
      return NextResponse.json({ error: 'Math channel not found' }, { status: 404 });
    }

    const mathChannel = await (prisma as any).mathChannel.findFirst({ where: { id, userId } });

    // Get all channels to determine index for color
    const allChannels = await (prisma as any).mathChannel.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    const channelIndex = (allChannels as any[]).findIndex((ch: any) => ch.id === id);
    
    // Color palette for math channels (visible on dark themes)
    const MATH_CHANNEL_COLORS = [
      '#3b82f6', '#10b981', '#f59e0b', '#ec4899',
      '#8b5cf6', '#06b6d4', '#f97316', '#14b8a6',
    ];
    const defaultColor = MATH_CHANNEL_COLORS[channelIndex % MATH_CHANNEL_COLORS.length];
    
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
      defaultColor,
    };

    return NextResponse.json(channel);
  } catch (error) {
    console.error('Error updating math channel:', error);
    return NextResponse.json(
      { error: 'Failed to update math channel' },
      { status: 500 }
    );
  }
}

// DELETE /api/channels/math/[id] - Delete a math channel
export async function DELETE(
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

    const { id } = params;

    const result = await (prisma as any).mathChannel.deleteMany({
      where: { id, userId },
    });

    if (!result.count) {
      return NextResponse.json({ error: 'Math channel not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting math channel:', error);
    return NextResponse.json(
      { error: 'Failed to delete math channel' },
      { status: 500 }
    );
  }
}
