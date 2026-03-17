import { prisma } from '@purplesector/db-prisma';

export type SessionReadAccess = 'PRIVATE' | 'ORG' | 'PUBLIC';

export interface SessionAccessCheckResult {
  ok: boolean;
  reason?: 'NOT_FOUND' | 'FORBIDDEN';
  ownerUserId?: string;
}

export async function canReadSessionById(params: {
  requesterUserId: string;
  sessionId: string;
}): Promise<SessionAccessCheckResult> {
  const { requesterUserId, sessionId } = params;

  const session = await (prisma as any).session.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      userId: true,
      readAccess: true,
      readAccessOrgId: true,
    },
  });

  if (!session) {
    return { ok: false, reason: 'NOT_FOUND' };
  }

  if (session.userId === requesterUserId) {
    return { ok: true, ownerUserId: session.userId };
  }

  const readAccess = (session.readAccess ?? 'PRIVATE') as SessionReadAccess;

  if (readAccess === 'PUBLIC') {
    return { ok: true, ownerUserId: session.userId };
  }

  if (readAccess === 'ORG') {
    const orgId = session.readAccessOrgId;
    if (!orgId) {
      return { ok: false, reason: 'FORBIDDEN' };
    }

    const membership = await (prisma as any).organizationMember.findFirst({
      where: {
        organizationId: orgId,
        userId: requesterUserId,
      },
      select: { id: true },
    });

    if (membership) {
      return { ok: true, ownerUserId: session.userId };
    }
  }

  return { ok: false, reason: 'FORBIDDEN' };
}

export async function requireCanReadSessionById(params: {
  requesterUserId: string;
  sessionId: string;
}): Promise<{ ownerUserId: string }> {
  const result = await canReadSessionById(params);

  if (!result.ok) {
    const err = new Error(result.reason ?? 'FORBIDDEN');
    (err as any).code = result.reason ?? 'FORBIDDEN';
    throw err;
  }

  if (!result.ownerUserId) {
    const err = new Error('FORBIDDEN');
    (err as any).code = 'FORBIDDEN';
    throw err;
  }

  return { ownerUserId: result.ownerUserId };
}
