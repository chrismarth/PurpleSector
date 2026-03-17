import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@purplesector/db-prisma';
import { requireAuthUserId } from '@/lib/auth';

// DELETE /api/tokens/[id] - revoke a token
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  let userId: string;
  try {
    userId = requireAuthUserId();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await (prisma as any).apiToken.updateMany({
    where: {
      id: params.id,
      userId,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });

  if (!result.count) {
    return NextResponse.json({ error: 'Token not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
