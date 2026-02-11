import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@purplesector/db-prisma';
import { requireAuthUserId } from '@/lib/api-auth';

export async function GET() {
  let userId: string;
  try {
    userId = requireAuthUserId();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await (prisma as any).user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, fullName: true, avatarUrl: true, role: true },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json(user);
}

export async function PUT(request: NextRequest) {
  let userId: string;
  try {
    userId = requireAuthUserId();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { fullName, avatarUrl } = body as { fullName?: string; avatarUrl?: string | null };

    const data: Record<string, unknown> = {};
    if (fullName !== undefined) data.fullName = fullName;
    if (avatarUrl !== undefined) data.avatarUrl = avatarUrl;

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const updated = await (prisma as any).user.update({
      where: { id: userId },
      data,
      select: { id: true, username: true, fullName: true, avatarUrl: true, role: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
