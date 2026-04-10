import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME } from '@/lib/auth';
import { prisma } from '@purplesector/db-prisma';

const STUB_PASSWORD = 'password';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body as { username?: string; password?: string };

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }

    if (password !== STUB_PASSWORD) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    if (username !== 'admin' && username !== 'user') {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const dbUser = await prisma.user.upsert({
      where: { username },
      update: {
        role: username === 'admin' ? 'ORG_ADMIN' : 'USER',
        fullName: username === 'admin' ? 'Admin User' : 'Regular User',
      },
      create: {
        username,
        role: username === 'admin' ? 'ORG_ADMIN' : 'USER',
        fullName: username === 'admin' ? 'Admin User' : 'Regular User',
      },
      select: { id: true },
    });

    const response = NextResponse.json({ ok: true });
    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: dbUser.id,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Error logging in:', error);
    return NextResponse.json({ error: 'Failed to login' }, { status: 500 });
  }
}
