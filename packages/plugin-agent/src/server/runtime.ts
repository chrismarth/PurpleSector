import { ChatOpenAI } from '@langchain/openai';
import { tool as langchainTool, type DynamicStructuredTool } from '@langchain/core/tools';
import { StateGraph, Annotation, END, START } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import {
  HumanMessage,
  AIMessage,
  SystemMessage,
  ToolMessage,
  type BaseMessage,
} from '@langchain/core/messages';
import type {
  AgentToolDefinition,
  AgentToolHandler,
  AgentToolContext,
} from '@purplesector/plugin-api';

// ── Types ──

export interface AgentPlanStep {
  id: string;
  toolName: string;
  args: Record<string, unknown>;
  description: string;
  status: 'pending' | 'running' | 'done' | 'failed';
  result?: unknown;
}

export interface AgentPlan {
  id: string;
  steps: AgentPlanStep[];
  status: 'draft' | 'approved' | 'executing' | 'completed' | 'failed';
}

export interface AgentResponse {
  content: string;
  plan?: AgentPlan;
  toolResults?: Array<{ toolName: string; result: unknown }>;
}

export interface AgentInvokeParams {
  messages: Array<{ role: string; content: string }>;
  toolContext: AgentToolContext;
  model?: string;
  memoryContext?: string;
}

// ── Convert AgentTool definitions + handlers to LangChain tools ──
// LangChain's tool() helper accepts JSON Schema directly, so no
// manual Zod conversion is needed.

function buildLangChainTools(
  definitions: AgentToolDefinition[],
  handlers: Record<string, AgentToolHandler>,
  toolContext: AgentToolContext,
): DynamicStructuredTool[] {
  const tools: DynamicStructuredTool[] = [];

  for (const def of definitions) {
    const handler = handlers[def.name];
    if (!handler) continue;

    tools.push(
      langchainTool(
        async (args: Record<string, unknown>) => {
          const result = await handler(args, toolContext);
          return JSON.stringify(result);
        },
        {
          name: def.name,
          description: def.description,
          schema: def.inputSchema as any,
        },
      ) as unknown as DynamicStructuredTool,
    );
  }

  return tools;
}

// ── System prompt ──

function buildSystemPrompt(
  definitions: AgentToolDefinition[],
  memoryContext?: string,
): string {
  const mutatingTools = definitions.filter((d) => d.mutating).map((d) => d.name);

  let prompt = `You are the Purple Sector AI Agent — an embedded assistant for a racing telemetry analysis application.

You can help users manage events, sessions, laps, vehicles, vehicle configurations, vehicle setups, run plans, and analysis layouts. Anything else outside of these domains is outside of your expertise, and you should politely decline to assist.

IMPORTANT RULES:
1. When the user asks a question that only requires reading data, use the appropriate tools and respond directly.
2. When the user asks you to CREATE, UPDATE, or DELETE something, you MUST formulate a plan first. Output your plan as a structured list of steps, then wait for the user to approve before executing.
3. The following tools are MUTATING and require plan mode: ${mutatingTools.join(', ')}
4. When presenting a plan, describe each step in plain language so the user can verify it.
5. After the user approves a plan, execute each step in order and report results.
6. Be concise and helpful. Use racing terminology where appropriate.
7. If you're unsure about something, ask the user for clarification.`;

  if (memoryContext) {
    prompt += `\n\nRELEVANT CONTEXT FROM PAST CONVERSATIONS:\n${memoryContext}`;
  }

  return prompt;
}

// ── LangGraph Agent ──

const AgentState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (prev, next) => [...prev, ...next],
    default: () => [],
  }),
});

export function createAgentRuntime(
  definitions: AgentToolDefinition[],
  handlers: Record<string, AgentToolHandler>,
) {
  return {
    async invoke(params: AgentInvokeParams): Promise<AgentResponse> {
      const { messages, toolContext, model: modelName, memoryContext } = params;

      const llm = new ChatOpenAI({
        modelName: modelName || 'gpt-4',
        temperature: 0,
      });

      const langchainTools = buildLangChainTools(definitions, handlers, toolContext);
      const llmWithTools = llm.bindTools(langchainTools);

      const systemPrompt = buildSystemPrompt(definitions, memoryContext);

      // Convert input messages to LangChain format
      const langchainMessages: BaseMessage[] = [
        new SystemMessage(systemPrompt),
      ];

      for (const msg of messages) {
        if (msg.role === 'user') {
          langchainMessages.push(new HumanMessage(msg.content));
        } else if (msg.role === 'assistant') {
          langchainMessages.push(new AIMessage(msg.content));
        }
      }

      // Build the graph
      const toolNode = new ToolNode(langchainTools);

      async function callModel(state: typeof AgentState.State) {
        const response = await llmWithTools.invoke(state.messages);
        return { messages: [response] };
      }

      function shouldContinue(state: typeof AgentState.State): string {
        const lastMessage = state.messages[state.messages.length - 1];
        if (
          lastMessage &&
          'tool_calls' in lastMessage &&
          Array.isArray((lastMessage as AIMessage).tool_calls) &&
          (lastMessage as AIMessage).tool_calls!.length > 0
        ) {
          // Check if any tool call is mutating
          const toolCalls = (lastMessage as AIMessage).tool_calls!;
          const hasMutating = toolCalls.some((tc) => {
            const def = definitions.find((d) => d.name === tc.name);
            return def?.mutating === true;
          });

          if (hasMutating) {
            // Don't execute — return plan to user
            return 'plan';
          }

          return 'tools';
        }
        return END;
      }

      const graph = new StateGraph(AgentState)
        .addNode('agent', callModel)
        .addNode('tools', toolNode)
        .addEdge(START, 'agent')
        .addConditionalEdges('agent', shouldContinue, {
          tools: 'tools',
          plan: END,
          [END]: END,
        })
        .addEdge('tools', 'agent')
        .compile();

      const result = await graph.invoke({
        messages: langchainMessages,
      });

      // Extract the response
      const allMessages = result.messages as BaseMessage[];
      const lastMessage = allMessages[allMessages.length - 1];

      // Collect tool results from intermediate messages
      const toolResults: Array<{ toolName: string; result: unknown }> = [];
      for (const msg of allMessages) {
        if (msg instanceof ToolMessage) {
          try {
            toolResults.push({
              toolName: msg.name || 'unknown',
              result: JSON.parse(msg.content as string),
            });
          } catch {
            toolResults.push({ toolName: msg.name || 'unknown', result: msg.content });
          }
        }
      }

      // Check if we stopped at plan mode (last message is AIMessage with mutating tool calls)
      if (
        lastMessage instanceof AIMessage &&
        lastMessage.tool_calls &&
        lastMessage.tool_calls.length > 0
      ) {
        const hasMutating = lastMessage.tool_calls.some((tc) => {
          const def = definitions.find((d) => d.name === tc.name);
          return def?.mutating === true;
        });

        if (hasMutating) {
          const plan: AgentPlan = {
            id: `plan_${Date.now()}`,
            status: 'draft',
            steps: lastMessage.tool_calls.map((tc, i) => ({
              id: `step_${i}`,
              toolName: tc.name,
              args: tc.args as Record<string, unknown>,
              description: describeToolCall(tc.name, tc.args as Record<string, unknown>, definitions),
              status: 'pending' as const,
            })),
          };

          return {
            content: lastMessage.content as string || 'I\'ve prepared a plan for you to review:',
            plan,
            toolResults,
          };
        }
      }

      return {
        content: (lastMessage as AIMessage).content as string,
        toolResults: toolResults.length > 0 ? toolResults : undefined,
      };
    },

    async executePlan(
      plan: AgentPlan,
      toolContext: AgentToolContext,
    ): Promise<AgentPlan> {
      const executedPlan: AgentPlan = { ...plan, status: 'executing', steps: [...plan.steps] };

      for (let i = 0; i < executedPlan.steps.length; i++) {
        const step = { ...executedPlan.steps[i] };
        step.status = 'running';
        executedPlan.steps[i] = step;

        const handler = handlers[step.toolName];
        if (!handler) {
          step.status = 'failed';
          step.result = { success: false, message: `Unknown tool: ${step.toolName}` };
          executedPlan.status = 'failed';
          return executedPlan;
        }

        try {
          const result = await handler(step.args, toolContext);
          step.result = result;
          step.status = result.success ? 'done' : 'failed';

          if (!result.success) {
            executedPlan.status = 'failed';
            return executedPlan;
          }
        } catch (error) {
          step.status = 'failed';
          step.result = { success: false, message: String(error) };
          executedPlan.status = 'failed';
          return executedPlan;
        }

        executedPlan.steps[i] = step;
      }

      executedPlan.status = 'completed';
      return executedPlan;
    },
  };
}

function describeToolCall(
  name: string,
  args: Record<string, unknown>,
  definitions: AgentToolDefinition[],
): string {
  const def = definitions.find((d) => d.name === name);
  const label = def?.description || name;

  const keyArgs = Object.entries(args)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k}: "${v}"`)
    .join(', ');

  return keyArgs ? `${label} (${keyArgs})` : label;
}
