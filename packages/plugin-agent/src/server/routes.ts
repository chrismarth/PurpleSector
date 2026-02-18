import { NextResponse } from 'next/server';
import type { PluginRequestContext, AgentToolContext } from '@purplesector/plugin-api';
import { createAgentRuntime, type AgentPlan } from './runtime';
import { allToolDefinitions, createAllToolHandlers } from './tools';
import { getMemoryContext, generateConversationSummary } from './memory';

let runtimeInstance: ReturnType<typeof createAgentRuntime> | null = null;
let prismaRef: any = null;

export function initRoutes(prisma: any) {
  prismaRef = prisma;
  const handlers = createAllToolHandlers(prisma);
  runtimeInstance = createAgentRuntime(allToolDefinitions, handlers);
}

function getRuntime() {
  if (!runtimeInstance) throw new Error('Agent runtime not initialized');
  return runtimeInstance;
}

// ── POST /chat ──

export async function handleChat(req: Request, ctx: PluginRequestContext): Promise<Response> {
  try {
    const body = await req.json();
    const {
      conversationId,
      message,
      appContext,
      model,
    } = body as {
      conversationId?: string;
      message: string;
      appContext?: { page: string; eventId?: string; sessionId?: string; lapId?: string };
      model?: string;
    };

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const toolContext: AgentToolContext = {
      userId: ctx.userId,
      appContext,
    };

    // Get or create conversation
    let convId: string;
    if (conversationId) {
      convId = conversationId;
    } else {
      const conv = await prismaRef.agentConversation.create({
        data: {
          userId: ctx.userId,
          context: appContext ? JSON.stringify(appContext) : null,
        },
      });
      convId = conv.id;
    }

    // Save user message
    await prismaRef.agentMessage.create({
      data: {
        conversationId: convId,
        role: 'user',
        content: message,
      },
    });

    // Load conversation history
    const dbMessages = await prismaRef.agentMessage.findMany({
      where: { conversationId: convId },
      orderBy: { createdAt: 'asc' },
      select: { role: true, content: true },
    });

    const chatMessages = dbMessages
      .filter((m: any) => m.role === 'user' || m.role === 'assistant')
      .map((m: any) => ({ role: m.role, content: m.content }));

    // Get memory context from past conversations
    const memoryContext = convId
      ? await getMemoryContext(prismaRef, ctx.userId, message)
      : undefined;

    // Invoke agent
    const runtime = getRuntime();
    const response = await runtime.invoke({
      messages: chatMessages,
      toolContext,
      model,
      memoryContext,
    });

    // Save assistant message
    await prismaRef.agentMessage.create({
      data: {
        conversationId: convId,
        role: 'assistant',
        content: response.content,
        plan: response.plan ? JSON.stringify(response.plan) : null,
        toolResults: response.toolResults ? JSON.stringify(response.toolResults) : null,
      },
    });

    // Auto-generate summary after a few messages
    generateConversationSummary(prismaRef, convId).catch(() => {});

    return NextResponse.json({
      conversationId: convId,
      content: response.content,
      plan: response.plan || null,
      toolResults: response.toolResults || null,
    });
  } catch (error) {
    console.error('Agent chat error:', error);
    return NextResponse.json(
      { error: 'Agent chat failed', details: String(error) },
      { status: 500 },
    );
  }
}

// ── POST /plan/approve ──

export async function handlePlanApprove(req: Request, ctx: PluginRequestContext): Promise<Response> {
  try {
    const body = await req.json();
    const { conversationId, plan } = body as { conversationId: string; plan: AgentPlan };

    if (!conversationId || !plan) {
      return NextResponse.json({ error: 'conversationId and plan are required' }, { status: 400 });
    }

    const toolContext: AgentToolContext = { userId: ctx.userId };

    const runtime = getRuntime();
    const executedPlan = await runtime.executePlan(plan, toolContext);

    // Save execution result as a message
    const stepSummaries = executedPlan.steps.map((s) => {
      const status = s.status === 'done' ? '✓' : '✗';
      const msg = (s.result as any)?.message || '';
      return `${status} ${s.description} — ${msg}`;
    });

    const content = executedPlan.status === 'completed'
      ? `Plan executed successfully:\n${stepSummaries.join('\n')}`
      : `Plan execution failed:\n${stepSummaries.join('\n')}`;

    await prismaRef.agentMessage.create({
      data: {
        conversationId,
        role: 'assistant',
        content,
        plan: JSON.stringify(executedPlan),
      },
    });

    return NextResponse.json({
      conversationId,
      plan: executedPlan,
      content,
    });
  } catch (error) {
    console.error('Plan approve error:', error);
    return NextResponse.json(
      { error: 'Plan execution failed', details: String(error) },
      { status: 500 },
    );
  }
}

// ── POST /plan/reject ──

export async function handlePlanReject(req: Request, ctx: PluginRequestContext): Promise<Response> {
  try {
    const body = await req.json();
    const { conversationId, reason } = body as { conversationId: string; reason?: string };

    if (!conversationId) {
      return NextResponse.json({ error: 'conversationId is required' }, { status: 400 });
    }

    const content = reason
      ? `Plan rejected: ${reason}`
      : 'Plan rejected by user.';

    await prismaRef.agentMessage.create({
      data: {
        conversationId,
        role: 'user',
        content,
      },
    });

    return NextResponse.json({ conversationId, content });
  } catch (error) {
    console.error('Plan reject error:', error);
    return NextResponse.json(
      { error: 'Plan rejection failed', details: String(error) },
      { status: 500 },
    );
  }
}

// ── GET /conversations ──

export async function handleListConversations(req: Request, ctx: PluginRequestContext): Promise<Response> {
  try {
    const conversations = await prismaRef.agentConversation.findMany({
      where: { userId: ctx.userId },
      select: {
        id: true,
        title: true,
        summary: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { messages: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json(conversations);
  } catch (error) {
    console.error('List conversations error:', error);
    return NextResponse.json(
      { error: 'Failed to list conversations' },
      { status: 500 },
    );
  }
}

// ── GET /conversations/:id ──

export async function handleGetConversation(req: Request, ctx: PluginRequestContext): Promise<Response> {
  try {
    const conversationId = ctx.params.id;
    if (!conversationId) {
      return NextResponse.json({ error: 'Conversation ID is required' }, { status: 400 });
    }

    const conversation = await prismaRef.agentConversation.findFirst({
      where: { id: conversationId, userId: ctx.userId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Parse JSON fields in messages
    const messages = conversation.messages.map((m: any) => ({
      ...m,
      toolCalls: m.toolCalls ? JSON.parse(m.toolCalls) : null,
      toolResults: m.toolResults ? JSON.parse(m.toolResults) : null,
      plan: m.plan ? JSON.parse(m.plan) : null,
    }));

    return NextResponse.json({ ...conversation, messages });
  } catch (error) {
    console.error('Get conversation error:', error);
    return NextResponse.json(
      { error: 'Failed to get conversation' },
      { status: 500 },
    );
  }
}
