import { prisma } from '@purplesector/db-prisma';
import { getAuthUserFromCookies } from '@/lib/auth';

type AuthUser = {
  id: string;
  username: string;
  role: 'ORG_ADMIN' | 'USER';
  fullName: string;
  avatarUrl: string | null;
};

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
  } catch {}

  return null;
}

export async function getServerNavEvents(): Promise<unknown[]> {
  const user = getAuthUserFromCookies();
  if (!user) return [];

  const events = await (prisma as any).event.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  });

  if (!Array.isArray(events)) return [];
  return events.map((e: any) => ({
    id: e.id,
    name: e.name,
    description: e.description,
    location: e.location,
    startDate: e.startDate?.toISOString?.() ?? e.startDate ?? null,
    endDate: e.endDate?.toISOString?.() ?? e.endDate ?? null,
    createdAt: e.createdAt instanceof Date ? e.createdAt.toISOString() : e.createdAt,
  }));
}
