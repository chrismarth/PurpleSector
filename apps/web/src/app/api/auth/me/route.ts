import { NextResponse } from 'next/server';
import { prisma } from '@purplesector/db-prisma';
import { getAuthUserFromCookies } from '@/lib/auth';

type AuthUser = {
  id: string;
  username: string;
  role: 'ORG_ADMIN' | 'USER';
  fullName: string;
  avatarUrl: string | null;
};

export async function GET() {
  const cookieUser = getAuthUserFromCookies();
  if (!cookieUser) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  // Cookie stores the user UUID; fetch the full user record.
  try {
    const dbUser = await prisma.user.findUnique({
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
    // DB not available
  }

  return NextResponse.json({ user: null }, { status: 401 });
}
