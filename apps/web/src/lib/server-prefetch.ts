import { prisma } from '@purplesector/db-prisma';
import { getAuthUserFromCookies } from '@/lib/auth';
import type { AuthUser } from '@/lib/auth';

export async function getServerAuthMe(): Promise<AuthUser | null> {
  const cookieUser = getAuthUserFromCookies();
  if (!cookieUser) return null;

  try {
    const dbUser = await (prisma as any).user.findUnique({
      where: { id: cookieUser.id },
      select: { id: true, username: true, role: true, fullName: true, avatarUrl: true },
    });

    if (dbUser) {
      return {
        id: dbUser.id,
        username: dbUser.username,
        role: dbUser.role as AuthUser['role'],
        fullName: dbUser.fullName,
        avatarUrl: dbUser.avatarUrl ?? null,
      };
    }
  } catch {
    // fall back to cookieUser
  }

  return {
    id: cookieUser.id,
    username: cookieUser.username,
    role: cookieUser.role as AuthUser['role'],
    fullName: cookieUser.fullName,
    avatarUrl: cookieUser.avatarUrl,
  };
}

export async function getServerNavEventsTree(): Promise<unknown[]> {
  const user = getAuthUserFromCookies();
  if (!user) return [];

  const events = await (prisma as any).event.findMany({
    where: { userId: user.id },
    include: {
      sessions: {
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        include: {
          laps: {
            orderBy: { lapNumber: 'asc' },
            select: { id: true, lapNumber: true, lapTime: true },
          },
        },
      },
      _count: { select: { sessions: true } },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return Array.isArray(events) ? events : [];
}
