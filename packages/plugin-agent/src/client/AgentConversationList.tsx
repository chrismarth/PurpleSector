'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { MessageSquare, Plus, Loader2 } from 'lucide-react';

interface ConversationSummary {
  id: string;
  title: string | null;
  summary: string | null;
  createdAt: string;
  updatedAt: string;
  _count: { messages: number };
}

interface AgentConversationListProps {
  activeConversationId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
}

export function AgentConversationList({ activeConversationId, onSelect, onNew }: AgentConversationListProps) {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/plugins/agent/conversations');
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setConversations(data);
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [activeConversationId]);

  return (
    <div className="space-y-2">
      <button
        onClick={onNew}
        className="w-full flex items-center gap-2 rounded-md border border-dashed px-3 py-2 text-xs font-medium hover:bg-muted transition-colors"
      >
        <Plus className="h-3 w-3" />
        New conversation
      </button>

      {loading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : conversations.length === 0 ? (
        <div className="text-xs text-muted-foreground text-center py-4">
          No conversations yet.
        </div>
      ) : (
        <div className="space-y-1">
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => onSelect(conv.id)}
              className={`w-full text-left rounded-md px-3 py-2 text-xs transition-colors ${
                activeConversationId === conv.id
                  ? 'bg-primary/10 border border-primary/20'
                  : 'hover:bg-muted'
              }`}
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
                <span className="truncate font-medium">
                  {conv.title || 'Untitled conversation'}
                </span>
              </div>
              <div className="text-muted-foreground mt-0.5 pl-5 truncate">
                {conv._count.messages} message{conv._count.messages !== 1 ? 's' : ''}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
