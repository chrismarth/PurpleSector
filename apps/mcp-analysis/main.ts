/**
 * MCP Server #1: Analysis Orchestrator
 * 
 * Provides different analysis implementations as tools.
 * This is the integration point for various analyzers (simple, deep, custom).
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Create MCP server
const server = new Server(
  {
    name: 'purple-sector-analysis',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

/**
 * List available analysis tools
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'analyzeSimple',
        description: 'Quick lap analysis with basic suggestions. Fast and cost-effective.',
        inputSchema: {
          type: 'object',
          properties: {
            lapId: {
              type: 'string',
              description: 'The ID of the lap to analyze',
            },
            referenceLapId: {
              type: 'string',
              description: 'Optional reference lap ID for comparison',
            },
          },
          required: ['lapId'],
        },
      },
      {
        name: 'analyzeDeep',
        description: 'Comprehensive agentic analysis using LangGraph. Explores data dynamically and provides detailed insights.',
        inputSchema: {
          type: 'object',
          properties: {
            lapId: {
              type: 'string',
              description: 'The ID of the lap to analyze',
            },
            referenceLapId: {
              type: 'string',
              description: 'Optional reference lap ID for comparison',
            },
            analysisDepth: {
              type: 'string',
              enum: ['standard', 'deep', 'expert'],
              description: 'Depth of analysis',
              default: 'standard',
            },
          },
          required: ['lapId'],
        },
      },
      {
        name: 'analyzeComparative',
        description: 'Compare multiple laps and identify patterns',
        inputSchema: {
          type: 'object',
          properties: {
            lapIds: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of lap IDs to compare',
            },
          },
          required: ['lapIds'],
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
      case 'analyzeSimple':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                message: 'Simple analysis will be handled by Next.js API route',
                lapId: args.lapId,
                referenceLapId: args.referenceLapId,
              }),
            },
          ],
        };
      
      case 'analyzeDeep':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                message: 'Deep analysis will be handled by LangGraph workflow',
                lapId: args.lapId,
                referenceLapId: args.referenceLapId,
                analysisDepth: args.analysisDepth || 'standard',
              }),
            },
          ],
        };
      
      case 'analyzeComparative':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                message: 'Comparative analysis not yet implemented',
                lapIds: args.lapIds,
              }),
            },
          ],
        };
      
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
 * Start the server
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Purple Sector Analysis MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
