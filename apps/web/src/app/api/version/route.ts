import { NextResponse } from 'next/server';

export async function GET() {
  const version = process.env.PURPLESECTOR_VERSION || process.env.npm_package_version || 'unknown';

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
