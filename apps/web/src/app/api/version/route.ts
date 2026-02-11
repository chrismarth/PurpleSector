import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import path from 'path';

function readRootPackageVersion(): string {
  try {
    const pkgPath = path.join(process.cwd(), 'package.json');
    const raw = readFileSync(pkgPath, 'utf8');
    const pkg = JSON.parse(raw) as { version?: string };
    return pkg.version || 'unknown';
  } catch {
    return 'unknown';
  }
}

export async function GET() {
  const version = readRootPackageVersion();

  return NextResponse.json({
    frontend: {
      name: 'purple-sector-web',
      version,
    },
    backend: {
      name: 'purple-sector-web',
      version,
    },
    runtime: {
      node: process.version,
      env: process.env.NODE_ENV || 'unknown',
    },
  });
}
