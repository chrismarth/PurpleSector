import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { MathTelemetryChannel, MathChannelInput } from '@purplesector/telemetry';

const prisma = new PrismaClient();

// PUT /api/channels/math/[id] - Update a math channel
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { label, unit, expression, inputs, validated, comment } = body;

    if (!label || !expression || !inputs) {
      return NextResponse.json(
        { error: 'Missing required fields: label, expression, inputs' },
        { status: 400 }
      );
    }

    const mathChannel = await prisma.mathChannel.update({
      where: { id },
      data: {
        label,
        unit: unit || '',
        expression,
        inputs: JSON.stringify(inputs),
        validated: validated ?? false,
        comment: comment || null,
      },
    });

    // Get all channels to determine index for color
    const allChannels = await prisma.mathChannel.findMany({
      orderBy: { createdAt: 'desc' },
    });
    const channelIndex = allChannels.findIndex(ch => ch.id === id);
    
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
    const { id } = params;

    await prisma.mathChannel.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting math channel:', error);
    return NextResponse.json(
      { error: 'Failed to delete math channel' },
      { status: 500 }
    );
  }
}
