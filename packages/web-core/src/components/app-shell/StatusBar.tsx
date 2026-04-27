

import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Wifi, WifiOff, Activity, AlertCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { fetchJson } from '@/lib/client-fetch';

interface ConnectionStatus {
  sessionId: string;
  sessionName: string;
  connected: boolean;
}

interface BackendHealth {
  status: 'healthy' | 'degraded' | 'unknown';
  services: Array<{
    name: string;
    status: 'healthy' | 'unhealthy' | 'unknown';
    message?: string;
  }>;
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

  const backendHealthQuery = useQuery({
    queryKey: ['backendHealth'] as const,
    queryFn: async (): Promise<BackendHealth> => {
      return fetchJson<BackendHealth>('/api/health', {
        unauthorized: { kind: 'return_fallback' },
        fallback: { status: 'unknown', services: [] },
      }).catch(() => ({ status: 'unknown', services: [] }));
    },
    refetchInterval: 10_000,
  });

  const backendHealth = backendHealthQuery.data ?? null;

  const activeCount = connections.size;
  const isConnected = activeCount > 0;
  const sessionNames = Array.from(connections.values()).map((c) => c.sessionName);

  const tooltipLabel = isConnected ? `Connected: ${sessionNames.join(', ')}` : 'No active telemetry connections';

  const backendHealthIcon = backendHealth?.status === 'healthy' ? (
    <Activity className="h-3 w-3 text-green-500" />
  ) : backendHealth?.status === 'degraded' ? (
    <AlertCircle className="h-3 w-3 text-yellow-500" />
  ) : (
    <AlertCircle className="h-3 w-3 text-gray-400" />
  );

  const backendHealthTooltip = backendHealth?.services?.length
    ? backendHealth.services.map(s => `${s.name}: ${s.status}`).join('\n')
    : 'Checking backend services...';

  return (
    <TooltipProvider delayDuration={300}>
    <footer className="flex items-center h-6 px-3 border-t bg-gray-50 dark:bg-gray-700 text-[11px] text-muted-foreground shrink-0">
      {/* Backend Health */}
      <Tooltip>
        <TooltipTrigger className="flex items-center gap-1">
          {backendHealthIcon}
          <span className="text-[10px]">
            {backendHealth?.status === 'healthy' ? 'Pipeline OK' : 
             backendHealth?.status === 'degraded' ? 'Pipeline Degraded' : 
             'Checking...'}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="whitespace-pre-line">{backendHealthTooltip}</TooltipContent>
      </Tooltip>

      <span className="mx-2 text-muted-foreground/40">|</span>

      {/* WebSocket Connections */}
      <Tooltip>
        <TooltipTrigger className="flex items-center gap-1">
          {isConnected ? (
            <Wifi className="h-3 w-3 text-green-500" />
          ) : (
            <WifiOff className="h-3 w-3" />
          )}
          {isConnected
            ? `${activeCount} active connection${activeCount > 1 ? 's' : ''}`
            : 'No active connections'}
        </TooltipTrigger>
        <TooltipContent side="top">{tooltipLabel}</TooltipContent>
      </Tooltip>

      <span className="mx-2 text-muted-foreground/40">|</span>

      {/* Recording Status */}
      <span className="flex items-center gap-1">
        <span className={`h-1.5 w-1.5 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
        {isConnected ? 'Recording' : 'Ready'}
      </span>
    </footer>
    </TooltipProvider>
  );
}
