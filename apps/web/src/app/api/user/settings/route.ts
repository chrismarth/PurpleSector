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

  const settings = await (prisma as any).userSettings.findUnique({
    where: { userId },
  });

  return NextResponse.json({
    theme: settings?.theme ?? null,
    data: settings?.data ? JSON.parse(settings.data) : null,
  });
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
    const { theme, data } = body as { theme?: string | null; data?: unknown };

    const updated = await (prisma as any).userSettings.upsert({
      where: { userId },
      update: {
        theme: theme ?? null,
        data: data === undefined ? undefined : data === null ? null : JSON.stringify(data),
      },
      create: {
        userId,
        theme: theme ?? null,
        data: data === undefined ? null : data === null ? null : JSON.stringify(data),
      },
    });

    return NextResponse.json({
      theme: updated.theme ?? null,
      data: updated.data ? JSON.parse(updated.data) : null,
    });
  } catch (error) {
    console.error('Error saving user settings:', error);
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}
