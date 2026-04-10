import { createMcpHandler, withMcpAuth } from 'mcp-handler';
import { z } from 'zod';
import { verifyMcpBearerToken } from '@/lib/mcp-auth';
import { prisma } from '@purplesector/db-prisma';
import { requireCanReadSessionById } from '@/lib/access-control';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const handler = createMcpHandler(
  async (server: any) => {
    server.registerTool(
      'ping',
      {
        title: 'ping',
        description: 'Health check tool.',
        inputSchema: z.object({}),
      },
      async () => ({
        content: [{ type: 'text', text: 'pong' }],
      }),
    );

    server.registerTool(
      'getSession',
      {
        title: 'getSession',
        description: 'Fetch a session by id if you have access (PRIVATE/ORG/PUBLIC).',
        inputSchema: z.object({
          sessionId: z.string().min(1),
        }),
      },
      async (
        { sessionId }: { sessionId: string },
        extra: any,
      ) => {
        const requesterUserId = (extra.authInfo?.extra as any)?.userId as string | undefined;
        if (!requesterUserId) {
          return {
            content: [{ type: 'text', text: JSON.stringify({ error: 'UNAUTHENTICATED' }) }],
          };
        }

        await requireCanReadSessionById({
          requesterUserId,
          sessionId,
        });

        const session = await prisma.session.findFirst({
          where: { id: sessionId },
          include: {
            event: true,
            laps: {
              orderBy: { lapNumber: 'asc' },
            },
          },
        });

        if (!session) {
          return {
            content: [{ type: 'text', text: JSON.stringify({ error: 'NOT_FOUND' }) }],
          };
        }

        return {
          content: [{ type: 'text', text: JSON.stringify(session) }],
        };
      },
    );

    server.registerTool(
      'listSessions',
      {
        title: 'listSessions',
        description: 'List sessions owned by the authenticated user (does not include shared sessions).',
        inputSchema: z.object({}),
      },
      async (_args: unknown, extra: any) => {
        const requesterUserId = (extra.authInfo?.extra as any)?.userId as string | undefined;
        if (!requesterUserId) {
          return {
            content: [{ type: 'text', text: JSON.stringify({ error: 'UNAUTHENTICATED' }) }],
          };
        }

        const sessions = await prisma.session.findMany({
          where: { userId: requesterUserId },
          include: {
            _count: {
              select: { laps: true },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

        return {
          content: [{ type: 'text', text: JSON.stringify(sessions) }],
        };
      },
    );

    server.registerTool(
      'createEvent',
      {
        title: 'createEvent',
        description: 'Stubbed mutation tool (not implemented yet).',
        inputSchema: z.object({
          name: z.string().min(1),
        }),
      },
      async () => {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: 'READ_ONLY',
                message: 'Mutations are not enabled yet.',
              }),
            },
          ],
        };
      },
    );
  },
  {},
  {
    basePath: '/api',
    verboseLogs: true,
    maxDuration: 60,
    // Start with Streamable HTTP transport. We can enable SSE once Redis is configured.
    disableSse: true,
  },
);

const authHandler = withMcpAuth(handler, verifyMcpBearerToken, {
  required: true,
  requiredScopes: ['mcp:read'],
  resourceMetadataPath: '/.well-known/oauth-protected-resource',
});

export { authHandler as GET, authHandler as POST, authHandler as DELETE };
