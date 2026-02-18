'use client';

import * as React from 'react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Loader2, History, ArrowLeft } from 'lucide-react';
import { AgentPlanView } from './AgentPlanView';
import { AgentConversationList } from './AgentConversationList';

interface AgentMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  plan?: AgentPlan | null;
  toolResults?: Array<{ toolName: string; result: unknown }> | null;
  createdAt: string;
}

interface AgentPlanStep {
  id: string;
  toolName: string;
  args: Record<string, unknown>;
  description: string;
  status: 'pending' | 'running' | 'done' | 'failed';
  result?: unknown;
}

interface AgentPlan {
  id: string;
  steps: AgentPlanStep[];
  status: 'draft' | 'approved' | 'executing' | 'completed' | 'failed';
}

type View = 'chat' | 'history';

export function AgentPanel() {
  const [view, setView] = useState<View>('chat');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [executing, setExecuting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const loadConversation = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/plugins/agent/conversations/${id}`);
      if (!res.ok) return;
      const data = await res.json();
      setConversationId(id);
      setMessages(data.messages.map((m: any) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        plan: m.plan,
        toolResults: m.toolResults,
        createdAt: m.createdAt,
      })));
      setView('chat');
    } catch {
      // ignore
    }
  }, []);

  const startNewConversation = useCallback(() => {
    setConversationId(null);
    setMessages([]);
    setView('chat');
  }, []);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;

    setInput('');
    setSending(true);

    const userMsg: AgentMessage = {
      id: `temp_${Date.now()}`,
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await fetch('/api/plugins/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          message: text,
          appContext: getAppContext(),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        setMessages((prev) => [...prev, {
          id: `err_${Date.now()}`,
          role: 'assistant',
          content: `Error: ${err.error || 'Failed to get response'}`,
          createdAt: new Date().toISOString(),
        }]);
        return;
      }

      const data = await res.json();
      setConversationId(data.conversationId);

      const assistantMsg: AgentMessage = {
        id: `resp_${Date.now()}`,
        role: 'assistant',
        content: data.content,
        plan: data.plan,
        toolResults: data.toolResults,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (error) {
      setMessages((prev) => [...prev, {
        id: `err_${Date.now()}`,
        role: 'assistant',
        content: `Error: ${String(error)}`,
        createdAt: new Date().toISOString(),
      }]);
    } finally {
      setSending(false);
    }
  }, [input, sending, conversationId]);

  const handleApprovePlan = useCallback(async (plan: AgentPlan) => {
    if (!conversationId || executing) return;
    setExecuting(true);

    try {
      const res = await fetch('/api/plugins/agent/plan/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, plan }),
      });

      if (!res.ok) return;
      const data = await res.json();

      setMessages((prev) => [...prev, {
        id: `exec_${Date.now()}`,
        role: 'assistant',
        content: data.content,
        plan: data.plan,
        createdAt: new Date().toISOString(),
      }]);

      // Notify the app that data has been mutated so pages can refetch.
      // router.refresh() only works for server components; the home page
      // uses client-side fetching, so we dispatch a custom DOM event that
      // any page can listen for.
      window.dispatchEvent(new CustomEvent('agent:data-mutated'));
    } catch {
      // ignore
    } finally {
      setExecuting(false);
    }
  }, [conversationId, executing]);

  const handleRejectPlan = useCallback(async () => {
    if (!conversationId) return;

    try {
      await fetch('/api/plugins/agent/plan/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId }),
      });

      setMessages((prev) => [...prev, {
        id: `rej_${Date.now()}`,
        role: 'user',
        content: 'Plan rejected.',
        createdAt: new Date().toISOString(),
      }]);
    } catch {
      // ignore
    }
  }, [conversationId]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  if (view === 'history') {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-2 px-4 py-3 border-b">
          <button
            onClick={() => setView('chat')}
            className="p-1 rounded hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium">Conversation History</span>
        </div>
        <div className="flex-1 overflow-auto p-3">
          <AgentConversationList
            activeConversationId={conversationId}
            onSelect={loadConversation}
            onNew={startNewConversation}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-end px-3 py-1.5 border-b">
        <button
          onClick={() => setView('history')}
          className="p-1.5 rounded hover:bg-muted text-muted-foreground"
          title="Conversation history"
        >
          <History className="h-4 w-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto px-3 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-8">
            <p className="font-medium">Purple Sector AI Agent</p>
            <p className="mt-1">Ask me to manage events, sessions, vehicles, run plans, or analysis layouts.</p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
              msg.role === 'user'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted'
            }`}>
              <div className="whitespace-pre-wrap break-words">{msg.content}</div>

              {msg.plan && msg.plan.status === 'draft' && (
                <div className="mt-2">
                  <AgentPlanView
                    plan={msg.plan}
                    onApprove={() => handleApprovePlan(msg.plan!)}
                    onReject={handleRejectPlan}
                    executing={executing}
                  />
                </div>
              )}

              {msg.plan && msg.plan.status !== 'draft' && (
                <div className="mt-2">
                  <AgentPlanView
                    plan={msg.plan}
                    onApprove={() => {}}
                    onReject={() => {}}
                    executing={false}
                  />
                </div>
              )}
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg px-3 py-2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t px-3 py-3">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask the agent..."
            rows={1}
            className="flex-1 resize-none rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[36px] max-h-[120px]"
            disabled={sending}
          />
          <button
            onClick={sendMessage}
            disabled={sending || !input.trim()}
            className="flex-shrink-0 rounded-md bg-primary p-2 text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function getAppContext(): { page: string; eventId?: string; sessionId?: string; lapId?: string } | undefined {
  if (typeof window === 'undefined') return undefined;
  const path = window.location.pathname;
  const segments = path.split('/').filter(Boolean);

  // Parse common route patterns
  // /events/[id] → eventId
  // /events/[id]/sessions/[id] → eventId + sessionId
  // /laps/[id] → lapId
  const context: { page: string; eventId?: string; sessionId?: string; lapId?: string } = {
    page: path,
  };

  for (let i = 0; i < segments.length; i++) {
    if (segments[i] === 'events' && segments[i + 1]) context.eventId = segments[i + 1];
    if (segments[i] === 'sessions' && segments[i + 1]) context.sessionId = segments[i + 1];
    if (segments[i] === 'laps' && segments[i + 1]) context.lapId = segments[i + 1];
  }

  return context;
}
