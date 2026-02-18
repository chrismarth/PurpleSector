import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@purplesector/db-prisma';
import { generateLapSuggestions, analyzeTelemetryData, createAnalyzer } from '@purplesector/lap-analysis-base';
import { requireAuthUserId } from '@/lib/api-auth';

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

    const lap = await (prisma as any).lap.findFirst({
      where: { id: params.id, userId },
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

    // Parse telemetry data
    const telemetryFrames = JSON.parse(lap.telemetryData);

    // Determine which reference lap to use
    let referenceLap = undefined;
    
    if (referenceLapId) {
      // Use explicitly selected reference lap
      const selectedReferenceLap = await (prisma as any).lap.findFirst({
        where: { id: referenceLapId, userId },
      });
      
      if (selectedReferenceLap && selectedReferenceLap.id !== lap.id) {
        const referenceTelemetry = JSON.parse(selectedReferenceLap.telemetryData);
        referenceLap = {
          lapTime: selectedReferenceLap.lapTime || 0,
          summary: analyzeTelemetryData(referenceTelemetry),
        };
      }
    } else {
      // Auto-find fastest lap in the same session
      const fastestLap = await (prisma as any).lap.findFirst({
        where: {
          userId,
          sessionId: lap.sessionId,
          lapTime: { not: null },
        },
        orderBy: {
          lapTime: 'asc',
        },
      });

      if (fastestLap && fastestLap.id !== lap.id) {
        const referenceTelemetry = JSON.parse(fastestLap.telemetryData);
        referenceLap = {
          lapTime: fastestLap.lapTime || 0,
          summary: analyzeTelemetryData(referenceTelemetry),
        };
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
    const updatedLap = await (prisma as any).lap.update({
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
