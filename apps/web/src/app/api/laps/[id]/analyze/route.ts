import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@purplesector/db-prisma';
import { generateLapSuggestions, analyzeTelemetryData, createAnalyzer } from '@purplesector/lap-analysis-base';
import { requireAuthUserId } from '@/lib/auth';
import { requireCanReadSessionById } from '@/lib/access-control';

// POST /api/laps/[id]/analyze - Analyze a lap with AI
export async function POST(
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

    const body = await request.json();
    const { referenceLapId } = body;

    const lapMeta = await prisma.lap.findUnique({
      where: { id: params.id },
      select: { id: true, sessionId: true },
    });

    if (!lapMeta) {
      return NextResponse.json({ error: 'Lap not found' }, { status: 404 });
    }

    await requireCanReadSessionById({ requesterUserId: userId, sessionId: lapMeta.sessionId });

    const lap = await prisma.lap.findFirst({
      where: { id: params.id },
    });

    if (!lap) {
      return NextResponse.json(
        { error: 'Lap not found' },
        { status: 404 }
      );
    }

    // Check if force re-analysis is requested
    const { forceReanalyze } = body;
    
    if (lap.analyzed && !forceReanalyze) {
      const existingSuggestions = JSON.parse(lap.suggestions || '[]');
      
      // Check if existing suggestions are just the fallback error
      const isFallbackError = existingSuggestions.length === 1 && 
        existingSuggestions[0].id === 'fallback-1';
      
      if (!isFallbackError) {
        return NextResponse.json({
          message: 'Lap already analyzed',
          suggestions: existingSuggestions,
        });
      }
      // If it's a fallback error, allow re-analysis
    }

    // Fetch telemetry data from Iceberg
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

    // Determine which reference lap to use
    let referenceLap = undefined;
    
    if (referenceLapId) {
      // Use explicitly selected reference lap
      const selectedReferenceLap = await prisma.lap.findFirst({
        where: { id: referenceLapId },
      });
      
      if (selectedReferenceLap && selectedReferenceLap.id !== lap.id) {
        const referenceTelemetry = await getLapFramesFromIceberg(
          userId,
          selectedReferenceLap.sessionId,
          selectedReferenceLap.lapNumber
        );
        if (referenceTelemetry.length > 0) {
          referenceLap = {
            lapTime: selectedReferenceLap.lapTime || 0,
            summary: analyzeTelemetryData(referenceTelemetry),
          };
        }
      }
    } else {
      // Auto-find fastest lap in the same session
      const fastestLap = await prisma.lap.findFirst({
        where: {
          sessionId: lap.sessionId,
          lapTime: { not: null },
        },
        orderBy: {
          lapTime: 'asc',
        },
      });

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
    }

    // Create analyzer based on configuration
    const analyzer = createAnalyzer();
    console.log(`Using analyzer: ${analyzer.getName()}`);

    // Analyze the lap
    const result = await analyzer.analyze({
      lapId: params.id,
      referenceLapId,
      telemetryFrames,
      lapTime: lap.lapTime || 0,
    });

    const suggestions = result.suggestions;

    // Update lap with suggestions
    const updatedLap = await prisma.lap.update({
      where: { id: params.id },
      data: {
        analyzed: true,
        suggestions: JSON.stringify(suggestions),
      },
    });

    return NextResponse.json({
      success: true,
      suggestions,
      lap: updatedLap,
    });
  } catch (error) {
    console.error('Error analyzing lap:', error);
    return NextResponse.json(
      { error: 'Failed to analyze lap' },
      { status: 500 }
    );
  }
}
