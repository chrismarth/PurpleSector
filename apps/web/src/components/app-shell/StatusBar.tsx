'use client';

import React, { useEffect, useState } from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ConnectionStatus {
  sessionId: string;
  sessionName: string;
  connected: boolean;
}

export function StatusBar() {
  const [connections, setConnections] = useState<Map<string, ConnectionStatus>>(new Map());

  useEffect(() => {
    function handleUpdate(e: Event) {
      const detail = (e as CustomEvent<ConnectionStatus>).detail;
      setConnections((prev) => {
        const next = new Map(prev);
        if (detail.connected) {
          next.set(detail.sessionId, detail);
        } else {
          next.delete(detail.sessionId);
        }
        return next;
      });
    }

    window.addEventListener('statusbar:connection', handleUpdate);
    return () => window.removeEventListener('statusbar:connection', handleUpdate);
  }, []);

  const activeCount = connections.size;
  const isConnected = activeCount > 0;
  const sessionNames = Array.from(connections.values()).map((c) => c.sessionName);

  const tooltipLabel = isConnected ? `Connected: ${sessionNames.join(', ')}` : 'No active telemetry connections';

  return (
    <TooltipProvider delayDuration={300}>
    <footer className="flex items-center h-6 px-3 border-t bg-gray-50 dark:bg-gray-700 text-[11px] text-muted-foreground shrink-0">
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="flex items-center gap-1">
            {isConnected ? (
              <Wifi className="h-3 w-3 text-green-500" />
            ) : (
              <WifiOff className="h-3 w-3" />
            )}
            {isConnected
              ? `${activeCount} active connection${activeCount > 1 ? 's' : ''}`
              : 'No active connections'}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top">{tooltipLabel}</TooltipContent>
      </Tooltip>
      <span className="mx-2 text-muted-foreground/40">|</span>
      <span className="flex items-center gap-1">
        <span className={`h-1.5 w-1.5 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
        {isConnected ? 'Recording' : 'Ready'}
      </span>
    </footer>
    </TooltipProvider>
  );
}
