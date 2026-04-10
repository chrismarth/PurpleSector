'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, ChevronDown, Plus, ListChecks, Archive, Flag } from 'lucide-react';
import { useNav } from './NavContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatLapTime } from '@/lib/utils';
import { CreateEventDialog } from './CreateEventDialog';
import { useLiveLapIndexStore } from '@/stores/liveLapIndexStore';

export function EventsTree() {
  const router = useRouter();
  const {
    events, loading, expandedNodes, toggleExpand, selectedNodeId, setSelectedNode, refresh: refreshNav,
    sessionsByEventId, lapsBySessionId, sessionsLoading, lapsLoading,
  } = useNav();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const bySessionId = useLiveLapIndexStore((s) => s.bySessionId);

  function handleEventCreated(event: { id: string; name: string }) {
    refreshNav();
    router.push(`/event/${event.id}`);
  }

  function handleCurrentLapClick(
    session: { id: string; name: string },
  ) {
    setSelectedNode(`session-current:${session.id}`);
    router.push(`/session/${session.id}`);
  }

  function handleEventClick(event: { id: string; name: string }) {
    setSelectedNode(`event:${event.id}`);
    router.push(`/event/${event.id}`);
  }

  function handleAddEvent() {
    setCreateDialogOpen(true);
  }

  function handleAddSession(eventId: string) {
    router.push(`/session/new?eventId=${encodeURIComponent(eventId)}`);
  }

  function handleAddRunPlan(eventId: string) {
    router.push(`/event/${eventId}/run-plan`);
  }

  function handleSessionClick(
    session: { id: string; name: string },
  ) {
    setSelectedNode(`session:${session.id}`);
    router.push(`/session/${session.id}`);
  }

  function handleLapClick(
    lap: { id: string; lapNumber: number; sessionId: string },
  ) {
    setSelectedNode(`lap:${lap.id}`);
    router.push(`/lap/${lap.id}`);
  }

  if (loading) {
    return (
      <div className="p-3 text-sm text-muted-foreground">
        Loading events...
      </div>
    );
  }

  return (
    <>
    <TooltipProvider delayDuration={300}>
    <div className="flex flex-col h-full">
      {/* Header with Add button */}
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Events
        </span>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleAddEvent}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Add Event</TooltipContent>
        </Tooltip>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto text-sm">
        {events.length === 0 ? (
          <div className="px-3 py-4 text-center">
            <p className="text-xs text-muted-foreground mb-2">No events yet</p>
            <button
              onClick={handleAddEvent}
              className="text-xs text-primary hover:underline"
            >
              Create your first event
            </button>
          </div>
        ) : (
          events.map((event) => {
            const eventExpanded = expandedNodes.has(`event:${event.id}`);
            const isSelected = selectedNodeId === `event:${event.id}`;
            const sessions = sessionsByEventId[event.id] ?? [];
            const isSessionsLoading = sessionsLoading[event.id] ?? false;

            return (
              <div key={event.id}>
                {/* Event node */}
                <div
                  className={`flex items-center gap-1 w-full px-2 py-1.5 hover:bg-accent transition-colors ${
                    isSelected ? 'bg-accent text-accent-foreground' : ''
                  }`}
                >
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleExpand(`event:${event.id}`); }}
                    className="h-4 w-4 flex items-center justify-center shrink-0 rounded hover:bg-accent-foreground/10"
                  >
                    {eventExpanded ? (
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </button>
                  <button
                    onClick={() => handleEventClick(event)}
                    className="flex-1 text-left truncate cursor-pointer"
                  >
                    {event.name}
                  </button>
                </div>

                {/* Expanded event children */}
                {eventExpanded && (
                  <div className="ml-4">
                    {/* Action buttons */}
                    <div className="flex items-center justify-end gap-1 px-2 py-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 text-xs px-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddSession(event.id);
                        }}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Session
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 text-xs px-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddRunPlan(event.id);
                        }}
                      >
                        <ListChecks className="h-3 w-3 mr-1" />
                        Run Plan
                      </Button>
                    </div>

                    {isSessionsLoading && (
                      <div className="px-2 py-1 text-xs text-muted-foreground">Loading sessions…</div>
                    )}

                    {/* Sessions */}
                    {sessions.map((session) => {
                      const sessionExpanded = expandedNodes.has(`session:${session.id}`);
                      const isSessionSelected = selectedNodeId === `session:${session.id}`;
                      const isLive = session.status === 'live' || session.status === 'recording' || session.status === 'active';
                      const isArchived = session.status === 'archived' || session.status === 'completed';
                      const laps = lapsBySessionId[session.id] ?? [];
                      const isLapsLoading = lapsLoading[session.id] ?? false;

                      return (
                        <div key={session.id}>
                          <div
                            className={`flex items-center gap-1 w-full px-2 py-1 hover:bg-accent transition-colors ${
                              isSessionSelected ? 'bg-accent text-accent-foreground' : ''
                            }`}
                          >
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleExpand(`session:${session.id}`); }}
                              className="h-4 w-4 flex items-center justify-center shrink-0 rounded hover:bg-accent-foreground/10"
                            >
                              {sessionExpanded ? (
                                <ChevronDown className="h-3 w-3 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-3 w-3 text-muted-foreground" />
                              )}
                            </button>
                            <button
                              onClick={() => handleSessionClick(session)}
                              className="flex-1 text-left truncate cursor-pointer"
                            >
                              {session.name}
                            </button>
                            {isLive && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="default" className="ml-auto h-4 text-[10px] px-1 bg-green-600 animate-pulse">
                                    <span className="h-1.5 w-1.5 rounded-full bg-green-300 mr-1 inline-block" />
                                    Live
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent side="right">Session is active — recording telemetry</TooltipContent>
                              </Tooltip>
                            )}
                            {isArchived && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="secondary" className="ml-auto h-4 text-[10px] px-1">
                                    <Archive className="h-2 w-2 mr-0.5" />
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent side="right">Session completed</TooltipContent>
                              </Tooltip>
                            )}
                          </div>

                          {/* Expanded session: laps */}
                          {sessionExpanded && (
                            <div className="ml-4">
                              {(() => {
                                // Always read store state so we can use it as a
                                // fallback for recently-archived sessions before
                                // the RisingWave JDBC sink has committed to Prisma.
                                const storeState = bySessionId[session.id] ?? null;
                                const completedLapNumbers = storeState?.completedLapNumbers ?? [];

                                const lapTimeByNumber = new Map<number, number | null>();
                                for (const lap of laps) {
                                  lapTimeByNumber.set(lap.lapNumber, lap.lapTime ?? null);
                                }

                                // Build lapNumber→UUID from Prisma data (available for
                                // laps the JDBC sink has already committed).
                                const lapIdByNumber = new Map<number, string>();
                                for (const lap of laps) {
                                  lapIdByNumber.set(lap.lapNumber, lap.id);
                                }

                                if (isLapsLoading) {
                                  return (
                                    <div className="px-2 py-1 text-xs text-muted-foreground">Loading laps…</div>
                                  );
                                }

                                // For live sessions use the real-time store.
                                // For archived sessions prefer Prisma laps, but fall back
                                // to the store if Prisma hasn't caught up yet.
                                const lapsToRender = isLive
                                  ? completedLapNumbers.map((lapNumber) => ({
                                      // Use real UUID if already committed, otherwise a
                                      // pending placeholder (not navigable yet).
                                      id: lapIdByNumber.get(lapNumber) ?? `pending:${session.id}:${lapNumber}`,
                                      lapNumber,
                                      lapTime: lapTimeByNumber.get(lapNumber) ?? (null as number | null),
                                    }))
                                  : laps.length > 0
                                    ? laps.map((lap) => ({
                                        id: lap.id,
                                        lapNumber: lap.lapNumber,
                                        lapTime: lap.lapTime,
                                      }))
                                    : completedLapNumbers.map((lapNumber) => ({
                                        id: `db:${session.id}:${lapNumber}`,
                                        lapNumber,
                                        lapTime: lapTimeByNumber.get(lapNumber) ?? (null as number | null),
                                      }));

                                if (lapsToRender.length === 0) {
                                  return (
                                    <div className="px-2 py-1 text-xs text-muted-foreground">
                                      {isLive ? 'No laps yet' : 'No laps'}
                                    </div>
                                  );
                                }

                                return (
                                  <>
                                    {lapsToRender.map((lap) => {
                                      const isLapSelected = selectedNodeId === `lap:${lap.id}`;

                                      return (
                                        <button
                                          key={lap.id}
                                          onClick={() => {
                                            if (isLive) {
                                              if (lap.id.startsWith('pending:')) return;
                                              setSelectedNode(`lap:${lap.id}`);
                                              router.push(`/lap/${lap.id}`);
                                            } else {
                                              handleLapClick(
                                                { id: lap.id, lapNumber: lap.lapNumber, sessionId: session.id },
                                              );
                                            }
                                          }}
                                          className={`flex items-center gap-1 w-full px-2 py-0.5 transition-colors text-left text-xs ${
                                            lap.id.startsWith('pending:')
                                              ? 'opacity-50 cursor-not-allowed'
                                              : 'hover:bg-accent cursor-pointer'
                                          } ${isLapSelected ? 'bg-accent text-accent-foreground' : ''}`}
                                        >
                                          <Flag className="h-2.5 w-2.5 shrink-0 text-muted-foreground" />
                                          <span>Lap {lap.lapNumber}</span>
                                          {lap.lapTime != null && (
                                            <span className="text-muted-foreground ml-1">
                                              {formatLapTime(lap.lapTime)}
                                            </span>
                                          )}
                                        </button>
                                      );
                                    })}

                                    {isLive && completedLapNumbers.length > 0 && (
                                      <div className="px-2 py-0.5 text-[10px] text-muted-foreground">
                                        {completedLapNumbers.length} completed
                                      </div>
                                    )}
                                  </>
                                );
                              })()}

                              {isLive && (
                                <button
                                  onClick={() => handleCurrentLapClick(session)}
                                  className={`flex items-center gap-1 w-full px-2 py-0.5 hover:bg-accent transition-colors text-left text-xs ${
                                    selectedNodeId === `session-current:${session.id}` ? 'bg-accent text-accent-foreground' : ''
                                  }`}
                                >
                                  <span className="h-2.5 w-2.5 rounded-full bg-green-500 shrink-0" />
                                  <span>Current Lap</span>
                                  <Badge variant="default" className="ml-auto h-3.5 text-[9px] px-1 bg-green-600">
                                    Live
                                  </Badge>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
    </TooltipProvider>
    <CreateEventDialog
      open={createDialogOpen}
      onOpenChange={setCreateDialogOpen}
      onCreated={handleEventCreated}
    />
    </>
  );
}
