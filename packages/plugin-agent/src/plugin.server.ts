/**
 * Agent Plugin — Server Entry Point
 *
 * This file is imported ONLY by the server-side plugin loader. It contains
 * all Node.js-only imports (LangGraph, Prisma access, etc.) that cannot
 * be bundled by the client-side webpack.
 */

import type {
  PluginModule,
  PluginServerContext,
} from '@purplesector/plugin-api';
import { manifest } from './plugin';
import {
  initRoutes,
  handleChat,
  handlePlanApprove,
  handlePlanReject,
  handleListConversations,
  handleGetConversation,
} from './server/routes';
import { createAllToolHandlers } from './server/tools';

const serverPlugin: PluginModule = {
  manifest,

  registerServer(ctx: PluginServerContext) {
    // Initialize the runtime with Prisma
    const prisma = ctx.getPrisma();
    initRoutes(prisma);

    // Register API routes
    ctx.registerApiRoute({ path: '/chat', method: 'POST', handler: handleChat });
    ctx.registerApiRoute({ path: '/plan/approve', method: 'POST', handler: handlePlanApprove });
    ctx.registerApiRoute({ path: '/plan/reject', method: 'POST', handler: handlePlanReject });
    ctx.registerApiRoute({ path: '/conversations', method: 'GET', handler: handleListConversations });
    ctx.registerApiRoute({ path: '/conversations/:id', method: 'GET', handler: handleGetConversation });

    // Register agent tool handlers (server-side execution)
    const handlers = createAllToolHandlers(prisma);
    for (const [name, handler] of Object.entries(handlers)) {
      ctx.registerAgentToolHandler(name, handler);
    }
  },
};

export default serverPlugin;
