import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@purplesector/db-prisma';
import { chatAboutLap, analyzeTelemetryData } from '@purplesector/lap-analysis-base';
import { requireAuthUserId } from '@/lib/auth';
import { requireCanReadSessionById } from '@/lib/access-control';

// POST /api/chat - Handle chat messages about a lap
export async function POST(request: NextRequest) {
  try {
    let userId: string;
    try {
      userId = requireAuthUserId();
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { lapId, message } = body;

    if (!lapId || !message) {
      return NextResponse.json(
        { error: 'lapId and message are required' },
        { status: 400 }
      );
    }

    const lapMeta = await prisma.lap.findUnique({
      where: { id: lapId },
      select: { id: true, sessionId: true },
    });

    if (!lapMeta) {
      return NextResponse.json(
        { error: 'Lap not found' },
        { status: 404 }
      );
    }

    await requireCanReadSessionById({ requesterUserId: userId, sessionId: lapMeta.sessionId });

    // Get lap data
    const lap = await prisma.lap.findFirst({
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
        userId,
        lapId,
        role: 'user',
        content: message,
      },
    });

    // Fetch telemetry frames from Iceberg
    const { getLapFramesFromIceberg } = await import('@/lib/trino');
    const telemetryFrames = await getLapFramesFromIceberg(
      userId,
      lap.sessionId,
      lap.lapNumber
    );
    
    if (telemetryFrames.length === 0) {
      return NextResponse.json(
        { error: 'No telemetry data available for this lap' },
        { status: 404 }
      );
    }

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
      const referenceTelemetry = await getLapFramesFromIceberg(
        userId,
        fastestLap.sessionId,
        fastestLap.lapNumber
      );
      if (referenceTelemetry.length > 0) {
        referenceLap = {
          lapTime: fastestLap.lapTime || 0,
          summary: analyzeTelemetryData(referenceTelemetry),
        };
      }
    }

    // Build conversation history
    const conversationHistory = (lap.chatMessages as any[]).map((msg: any) => ({
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
        userId,
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
