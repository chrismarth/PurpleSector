import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@purplesector/db-prisma';
import { requireAuthUserId } from '@/lib/auth';

function sha256Hex(value: string): string {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

function randomToken(): string {
  // 32 bytes -> 43 char base64url-ish; safe for copy/paste
  const raw = crypto.randomBytes(32).toString('base64url');
  return `ps_pat_${raw}`;
}

// GET /api/tokens - list tokens for current user (metadata only)
export async function GET() {
  let userId: string;
  try {
    userId = requireAuthUserId();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tokens = await prisma.apiToken.findMany({
    where: { userId },
    select: {
      id: true,
      name: true,
      scopes: true,
      createdAt: true,
      lastUsedAt: true,
      revokedAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(tokens);
}

// POST /api/tokens - create a new PAT for MCP
export async function POST(request: NextRequest) {
  let userId: string;
  try {
    userId = requireAuthUserId();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { name?: string; scopes?: string[] };
  const name = body.name?.trim() || 'MCP Token';
  const scopes = Array.isArray(body.scopes) && body.scopes.length > 0 ? body.scopes : ['mcp:read'];

  const token = randomToken();
  const tokenHash = sha256Hex(token);

  const created = await prisma.apiToken.create({
    data: {
      userId,
      name,
      tokenHash,
      scopes: JSON.stringify(scopes),
    },
    select: {
      id: true,
      name: true,
      scopes: true,
      createdAt: true,
      lastUsedAt: true,
      revokedAt: true,
    },
  });

  // Return raw token ONCE
  return NextResponse.json({
    token,
    record: created,
  });
}
