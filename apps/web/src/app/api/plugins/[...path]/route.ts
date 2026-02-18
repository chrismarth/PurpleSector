import { NextRequest, NextResponse } from 'next/server';
import { requireAuthUserId } from '@/lib/api-auth';
import { getRegisteredRoutes } from '@purplesector/plugin-registry';
import { initServerPlugins } from '@/lib/plugin-server';
import type { PluginRequestContext } from '@purplesector/plugin-api';

/**
 * Catch-all API route dispatcher for plugin-registered API routes.
 *
 * Routes are matched as: /api/plugins/<pluginId>/<path...>
 * The first path segment is the plugin ID, the rest is matched against
 * registered routes for that plugin.
 */

function matchRoute(
  registeredPath: string,
  actualPath: string,
): Record<string, string> | null {
  // registeredPath: '/conversations/:id'
  // actualPath:     '/conversations/abc123'
  const regParts = registeredPath.split('/').filter(Boolean);
  const actParts = actualPath.split('/').filter(Boolean);

  if (regParts.length !== actParts.length) return null;

  const params: Record<string, string> = {};
  for (let i = 0; i < regParts.length; i++) {
    if (regParts[i].startsWith(':')) {
      params[regParts[i].slice(1)] = actParts[i];
    } else if (regParts[i] !== actParts[i]) {
      return null;
    }
  }
  return params;
}

async function handleRequest(req: NextRequest, method: string) {
  try {
    // Ensure server-side plugins are initialized
    initServerPlugins();

    let userId: string;
    try {
      userId = requireAuthUserId();
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    // /api/plugins/agent/chat → ['agent', 'chat']
    const fullPath = url.pathname.replace(/^\/api\/plugins\//, '');
    const segments = fullPath.split('/').filter(Boolean);

    if (segments.length < 1) {
      return NextResponse.json({ error: 'Invalid plugin route' }, { status: 404 });
    }

    const pluginId = segments[0];
    const routePath = '/' + segments.slice(1).join('/');

    const routes = getRegisteredRoutes();

    for (const { pluginId: regPluginId, route } of routes) {
      // Match plugin ID: either exact match or the last segment of the manifest ID
      // e.g. 'purple-sector.agent' matches path segment 'agent'
      const pluginIdMatch =
        regPluginId === pluginId ||
        regPluginId.split('.').pop() === pluginId;

      if (!pluginIdMatch) continue;
      if (route.method !== method) continue;

      const params = matchRoute(route.path, routePath);
      if (params === null) continue;

      const ctx: PluginRequestContext = {
        userId,
        pluginId: regPluginId,
        params,
      };

      return await route.handler(req, ctx);
    }

    return NextResponse.json({ error: 'Plugin route not found' }, { status: 404 });
  } catch (error) {
    console.error('Plugin route error:', error);
    return NextResponse.json(
      { error: 'Internal plugin route error' },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  return handleRequest(req, 'GET');
}

export async function POST(req: NextRequest) {
  return handleRequest(req, 'POST');
}

export async function PUT(req: NextRequest) {
  return handleRequest(req, 'PUT');
}

export async function PATCH(req: NextRequest) {
  return handleRequest(req, 'PATCH');
}

export async function DELETE(req: NextRequest) {
  return handleRequest(req, 'DELETE');
}
