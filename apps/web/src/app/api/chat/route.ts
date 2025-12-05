import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@purplesector/db-prisma';
import { chatAboutLap, analyzeTelemetryData } from '@purplesector/analysis-base';

// POST /api/chat - Handle chat messages about a lap
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lapId, message } = body;

    if (!lapId || !message) {
      return NextResponse.json(
        { error: 'lapId and message are required' },
        { status: 400 }
      );
    }

    // Get lap data
    const lap = await prisma.lap.findUnique({
      where: { id: lapId },
      include: {
        chatMessages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!lap) {
      return NextResponse.json(
        { error: 'Lap not found' },
        { status: 404 }
      );
    }

    // Save user message
    await prisma.chatMessage.create({
      data: {
        lapId,
        role: 'user',
        content: message,
      },
    });

    // Parse telemetry and suggestions
    const telemetryFrames = JSON.parse(lap.telemetryData);
    const telemetrySummary = analyzeTelemetryData(telemetryFrames);
    const suggestions = lap.suggestions ? JSON.parse(lap.suggestions) : [];

    // Find fastest lap in the same session for reference
    const fastestLap = await prisma.lap.findFirst({
      where: {
        sessionId: lap.sessionId,
        lapTime: { not: null },
      },
      orderBy: {
        lapTime: 'asc',
      },
    });

    // Prepare reference lap data if available and it's not the current lap
    let referenceLap = undefined;
    if (fastestLap && fastestLap.id !== lap.id) {
      const referenceTelemetry = JSON.parse(fastestLap.telemetryData);
      referenceLap = {
        lapTime: fastestLap.lapTime || 0,
        summary: analyzeTelemetryData(referenceTelemetry),
      };
    }

    // Build conversation history
    const conversationHistory = lap.chatMessages.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }));

    // Add current message
    conversationHistory.push({
      role: 'user',
      content: message,
    });

    // Get AI response with reference lap context
    const aiResponse = await chatAboutLap(
      conversationHistory,
      telemetrySummary,
      suggestions,
      referenceLap
    );

    // Save assistant message
    const assistantMessage = await prisma.chatMessage.create({
      data: {
        lapId,
        role: 'assistant',
        content: aiResponse,
      },
    });

    return NextResponse.json({
      success: true,
      message: assistantMessage,
    });
  } catch (error) {
    console.error('Error in chat:', error);
    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    );
  }
}
