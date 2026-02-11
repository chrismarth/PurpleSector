import { NextResponse } from 'next/server';
import { prisma } from '@purplesector/db-prisma';
import { getAuthUserFromCookies } from '@/lib/auth';
import type { AuthUser } from '@/lib/auth';

export async function GET() {
  const cookieUser = getAuthUserFromCookies();
  if (!cookieUser) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  // Try to read from DB for up-to-date fullName / avatarUrl
  try {
    const dbUser = await (prisma as any).user.findUnique({
      where: { id: cookieUser.id },
      select: { id: true, username: true, role: true, fullName: true, avatarUrl: true },
    });

    if (dbUser) {
      const user: AuthUser = {
        id: dbUser.id,
        username: dbUser.username,
        role: dbUser.role as AuthUser['role'],
        fullName: dbUser.fullName,
        avatarUrl: dbUser.avatarUrl ?? null,
      };
      return NextResponse.json({ user });
    }
  } catch {
    // DB not available — fall through to cookie-based user
  }

  return NextResponse.json({ user: cookieUser });
}
