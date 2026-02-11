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

    await (prisma as any).user.upsert({
      where: { id: username },
      update: {
        username,
        role: username === 'admin' ? 'ORG_ADMIN' : 'USER',
        fullName: username === 'admin' ? 'Admin User' : 'Regular User',
      },
      create: {
        id: username,
        username,
        role: username === 'admin' ? 'ORG_ADMIN' : 'USER',
        fullName: username === 'admin' ? 'Admin User' : 'Regular User',
      },
    });

    const response = NextResponse.json({ ok: true });
    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: username,
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
