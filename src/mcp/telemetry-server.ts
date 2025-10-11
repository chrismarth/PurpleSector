/**
 * MCP Server #2: Telemetry Data Server
 * 
 * Provides rich data access tools for AI agents to explore telemetry data.
 * This server exposes various tools that allow agents to request specific
 * data they need for analysis.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { prisma } from '@/lib/db';
import { analyzeTelemetryData } from '@/lib/ai/analysis';

// Create MCP server
const server = new Server(
  {
    name: 'purple-sector-telemetry',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

/**
 * List available tools
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'getLapTelemetry',
        description: 'Get telemetry data for a specific lap. Can request summary or full resolution data.',
        inputSchema: {
          type: 'object',
          properties: {
            lapId: {
              type: 'string',
              description: 'The ID of the lap to retrieve',
            },
            resolution: {
              type: 'string',
              enum: ['summary', 'full'],
              description: 'Data resolution: summary (processed metrics) or full (all frames)',
              default: 'summary',
            },
          },
          required: ['lapId'],
        },
      },
      {
        name: 'getReferenceLap',
        description: 'Get the fastest lap from the same session to use as reference',
        inputSchema: {
          type: 'object',
          properties: {
            sessionId: {
              type: 'string',
              description: 'The session ID to find fastest lap in',
            },
            excludeLapId: {
              type: 'string',
              description: 'Optional lap ID to exclude (usually the current lap being analyzed)',
            },
          },
          required: ['sessionId'],
        },
      },
      {
        name: 'compareLaps',
        description: 'Compare two laps and get detailed differences',
        inputSchema: {
          type: 'object',
          properties: {
            lapId1: {
              type: 'string',
              description: 'First lap ID',
            },
            lapId2: {
              type: 'string',
              description: 'Second lap ID (reference lap)',
            },
          },
          required: ['lapId1', 'lapId2'],
        },
      },
      {
        name: 'getCornerAnalysis',
        description: 'Get detailed analysis of a specific corner or section',
        inputSchema: {
          type: 'object',
          properties: {
            lapId: {
              type: 'string',
              description: 'The lap ID',
            },
            startPosition: {
              type: 'number',
              description: 'Start position (0-1 normalized)',
            },
            endPosition: {
              type: 'number',
              description: 'End position (0-1 normalized)',
            },
          },
          required: ['lapId', 'startPosition', 'endPosition'],
        },
      },
    ],
  };
});

/**
 * Handle tool calls
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (!args) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ error: 'Missing arguments' }),
        },
      ],
    };
  }

  try {
    switch (name) {
      case 'getLapTelemetry':
        return await handleGetLapTelemetry(args);
      
      case 'getReferenceLap':
        return await handleGetReferenceLap(args);
      
      case 'compareLaps':
        return await handleCompareLaps(args);
      
      case 'getCornerAnalysis':
        return await handleGetCornerAnalysis(args);
      
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
    };
  }
});

/**
 * Tool Handlers
 */

async function handleGetLapTelemetry(args: any) {
  const { lapId, resolution = 'summary' } = args;

  const lap = await prisma.lap.findUnique({
    where: { id: lapId },
    include: {
      session: {
        select: { id: true, name: true },
      },
    },
  });

  if (!lap) {
    throw new Error(`Lap not found: ${lapId}`);
  }

  const telemetryFrames = JSON.parse(lap.telemetryData);

  if (resolution === 'summary') {
    // Return processed summary
    const summary = analyzeTelemetryData(telemetryFrames);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            lapId: lap.id,
            lapNumber: lap.lapNumber,
            lapTime: lap.lapTime,
            sessionName: lap.session.name,
            summary: {
              lapTime: summary.lapTime,
              avgSpeed: summary.avgSpeed,
              maxSpeed: summary.maxSpeed,
              brakingEvents: summary.brakingEvents.length,
              brakingZones: summary.brakingEvents.slice(0, 5).map((event, i) => ({
                zone: i + 1,
                position: event.position,
                intensity: event.intensity,
                duration: event.duration,
              })),
              throttleApplication: {
                avgApplication: summary.throttleApplication.avgApplication,
                smoothness: summary.throttleApplication.smoothness,
                fullThrottlePercent: summary.throttleApplication.fullThrottlePercent,
              },
              steeringSmoothness: summary.steeringSmooth,
            },
          }, null, 2),
        },
      ],
    };
  } else {
    // Return full telemetry (limited to avoid token overflow)
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            lapId: lap.id,
            lapNumber: lap.lapNumber,
            lapTime: lap.lapTime,
            frameCount: telemetryFrames.length,
            frames: telemetryFrames.slice(0, 100), // Limit to first 100 frames
            note: 'Full telemetry limited to 100 frames. Use getCornerAnalysis for specific sections.',
          }, null, 2),
        },
      ],
    };
  }
}

async function handleGetReferenceLap(args: any) {
  const { sessionId, excludeLapId } = args;

  const fastestLap = await prisma.lap.findFirst({
    where: {
      sessionId,
      lapTime: { not: null },
      ...(excludeLapId ? { id: { not: excludeLapId } } : {}),
    },
    orderBy: {
      lapTime: 'asc',
    },
    include: {
      session: {
        select: { name: true },
      },
    },
  });

  if (!fastestLap) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ message: 'No reference lap found in session' }),
        },
      ],
    };
  }

  const telemetryFrames = JSON.parse(fastestLap.telemetryData);
  const summary = analyzeTelemetryData(telemetryFrames);

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          lapId: fastestLap.id,
          lapNumber: fastestLap.lapNumber,
          lapTime: fastestLap.lapTime,
          sessionName: fastestLap.session.name,
          summary: {
            lapTime: summary.lapTime,
            avgSpeed: summary.avgSpeed,
            maxSpeed: summary.maxSpeed,
            throttleApplication: summary.throttleApplication,
            steeringSmoothness: summary.steeringSmooth,
          },
        }, null, 2),
      },
    ],
  };
}

async function handleCompareLaps(args: any) {
  const { lapId1, lapId2 } = args;

  const [lap1, lap2] = await Promise.all([
    prisma.lap.findUnique({ where: { id: lapId1 } }),
    prisma.lap.findUnique({ where: { id: lapId2 } }),
  ]);

  if (!lap1 || !lap2) {
    throw new Error('One or both laps not found');
  }

  const frames1 = JSON.parse(lap1.telemetryData);
  const frames2 = JSON.parse(lap2.telemetryData);

  const summary1 = analyzeTelemetryData(frames1);
  const summary2 = analyzeTelemetryData(frames2);

  const comparison = {
    lap1: {
      id: lap1.id,
      lapNumber: lap1.lapNumber,
      lapTime: lap1.lapTime,
    },
    lap2: {
      id: lap2.id,
      lapNumber: lap2.lapNumber,
      lapTime: lap2.lapTime,
    },
    differences: {
      lapTimeDiff: ((summary1.lapTime - summary2.lapTime) * 1000).toFixed(0) + 'ms',
      avgSpeedDiff: (summary1.avgSpeed - summary2.avgSpeed).toFixed(1) + ' km/h',
      maxSpeedDiff: (summary1.maxSpeed - summary2.maxSpeed).toFixed(1) + ' km/h',
      throttleSmoothnessDiff: ((summary1.throttleApplication.smoothness - summary2.throttleApplication.smoothness) * 100).toFixed(1) + '%',
      fullThrottleDiff: ((summary1.throttleApplication.fullThrottlePercent - summary2.throttleApplication.fullThrottlePercent)).toFixed(1) + '%',
      steeringSmoothnessDiff: ((summary1.steeringSmooth - summary2.steeringSmooth) * 100).toFixed(1) + '%',
    },
  };

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(comparison, null, 2),
      },
    ],
  };
}

async function handleGetCornerAnalysis(args: any) {
  const { lapId, startPosition, endPosition } = args;

  const lap = await prisma.lap.findUnique({
    where: { id: lapId },
  });

  if (!lap) {
    throw new Error(`Lap not found: ${lapId}`);
  }

  const telemetryFrames = JSON.parse(lap.telemetryData);
  
  // Filter frames in the specified range
  const cornerFrames = telemetryFrames.filter(
    (frame: any) => frame.normalizedPosition >= startPosition && frame.normalizedPosition <= endPosition
  );

  if (cornerFrames.length === 0) {
    throw new Error('No frames found in specified range');
  }

  // Analyze corner section
  const avgThrottle = cornerFrames.reduce((sum: number, f: any) => sum + f.throttle, 0) / cornerFrames.length;
  const avgBrake = cornerFrames.reduce((sum: number, f: any) => sum + f.brake, 0) / cornerFrames.length;
  const avgSteering = cornerFrames.reduce((sum: number, f: any) => sum + Math.abs(f.steering), 0) / cornerFrames.length;
  const avgSpeed = cornerFrames.reduce((sum: number, f: any) => sum + f.speed, 0) / cornerFrames.length;
  const minSpeed = Math.min(...cornerFrames.map((f: any) => f.speed));
  const maxSpeed = Math.max(...cornerFrames.map((f: any) => f.speed));

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          section: {
            start: startPosition,
            end: endPosition,
            frameCount: cornerFrames.length,
          },
          metrics: {
            avgThrottle: avgThrottle.toFixed(3),
            avgBrake: avgBrake.toFixed(3),
            avgSteering: avgSteering.toFixed(3),
            avgSpeed: avgSpeed.toFixed(1),
            minSpeed: minSpeed.toFixed(1),
            maxSpeed: maxSpeed.toFixed(1),
            speedDrop: (maxSpeed - minSpeed).toFixed(1),
          },
          frames: cornerFrames.slice(0, 20), // Sample frames
        }, null, 2),
      },
    ],
  };
}

/**
 * Start the server
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Purple Sector Telemetry MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
