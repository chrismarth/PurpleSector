import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import { prisma } from '@purplesector/db-prisma';
import crypto from 'crypto';

function sha256Hex(value: string): string {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

export async function verifyMcpBearerToken(
  req: Request,
  bearerToken?: string,
): Promise<AuthInfo | undefined> {
  if (!bearerToken) return undefined;

  const tokenHash = sha256Hex(bearerToken);

  const token = await (prisma as any).apiToken.findFirst({
    where: {
      tokenHash,
      revokedAt: null,
    },
    select: {
      id: true,
      userId: true,
      scopes: true,
    },
  });

  if (!token) return undefined;

  // Best-effort audit update (do not fail auth)
  (prisma as any).apiToken
    .update({
      where: { id: token.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => undefined);

  const scopes = token.scopes ? (JSON.parse(token.scopes) as string[]) : ['mcp:read'];

  return {
    token: bearerToken,
    scopes,
    clientId: token.userId,
    extra: {
      userId: token.userId,
    },
  };
}
