'use client';

import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Plus, ListChecks, Archive, Flag } from 'lucide-react';
import { useNav } from './NavContext';
import { useAppShell } from './AppShellContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatLapTime } from '@/lib/utils';
import { CreateEventDialog } from './CreateEventDialog';
import type { TabDescriptor } from '@purplesector/plugin-api';

function makeTabId(type: string, entityId?: string): string {
  return entityId ? `${type}:${entityId}` : `${type}:${Date.now()}`;
}

export function EventsTree() {
  const { events, loading, expandedNodes, toggleExpand, selectedNodeId, setSelectedNode, refresh: refreshNav } = useNav();
  const { openTab } = useAppShell();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  function handleEventCreated(event: { id: string; name: string }) {
    refreshNav();
    openTab({
      id: makeTabId('event-detail', event.id),
      type: 'event-detail',
      label: event.name,
      breadcrumbs: [event.name],
      entityId: event.id,
      closable: true,
    });
  }

  function handleEventClick(event: { id: string; name: string }) {
    setSelectedNode(`event:${event.id}`);
    openTab({
      id: makeTabId('event-detail', event.id),
      type: 'event-detail',
      label: event.name,
      breadcrumbs: [event.name],
      entityId: event.id,
      closable: true,
    });
  }

  function handleAddEvent() {
    setCreateDialogOpen(true);
  }

  function handleAddSession(eventId: string, eventName: string) {
    const tabId = makeTabId('session-new', eventId);
    openTab({
      id: tabId,
      type: 'session-new',
      label: 'New Session',
      breadcrumbs: [eventName, 'New Session'],
      parentIds: { eventId },
      closable: true,
    });
  }

  function handleAddRunPlan(eventId: string, eventName: string) {
    const tabId = makeTabId('run-plan-new', eventId);
    openTab({
      id: tabId,
      type: 'run-plan-new',
      label: 'Run Plan',
      breadcrumbs: [eventName, 'Run Plan'],
      entityId: eventId,
      closable: true,
    });
  }

  function handleSessionClick(
    session: { id: string; name: string },
    eventName: string
  ) {
    setSelectedNode(`session:${session.id}`);
    openTab({
      id: makeTabId('session-detail', session.id),
      type: 'session-detail',
      label: session.name,
      breadcrumbs: [eventName, session.name],
      entityId: session.id,
      closable: true,
    });
  }

  function handleLapClick(
    lap: { id: string; lapNumber: number },
    sessionName: string,
    eventName: string
  ) {
    setSelectedNode(`lap:${lap.id}`);
    openTab({
      id: makeTabId('lap-detail', lap.id),
      type: 'lap-detail',
      label: `Lap ${lap.lapNumber}`,
      breadcrumbs: [eventName, sessionName, `Lap ${lap.lapNumber}`],
      entityId: lap.id,
      closable: true,
    });
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
                          handleAddSession(event.id, event.name);
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
                          handleAddRunPlan(event.id, event.name);
                        }}
                      >
                        <ListChecks className="h-3 w-3 mr-1" />
                        Run Plan
                      </Button>
                    </div>

                    {/* Sessions */}
                    {event.sessions.map((session) => {
                      const sessionExpanded = expandedNodes.has(`session:${session.id}`);
                      const isSessionSelected = selectedNodeId === `session:${session.id}`;
                      const isLive = session.status === 'live' || session.status === 'recording' || session.status === 'active';
                      const isArchived = session.status === 'archived' || session.status === 'completed';

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
                              onClick={() => handleSessionClick(session, event.name)}
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
                              {session.laps.length === 0 ? (
                                <div className="px-2 py-1 text-xs text-muted-foreground">
                                  No laps
                                </div>
                              ) : (
                                session.laps.map((lap, idx) => {
                                  const isLapSelected = selectedNodeId === `lap:${lap.id}`;
                                  const isCurrentLap = isLive && idx === session.laps.length - 1;

                                  return (
                                    <button
                                      key={lap.id}
                                      onClick={() => handleLapClick(lap, session.name, event.name)}
                                      className={`flex items-center gap-1 w-full px-2 py-0.5 hover:bg-accent transition-colors text-left text-xs ${
                                        isLapSelected ? 'bg-accent text-accent-foreground' : ''
                                      }`}
                                    >
                                      <Flag className="h-2.5 w-2.5 shrink-0 text-muted-foreground" />
                                      <span>Lap {lap.lapNumber}</span>
                                      {lap.lapTime != null && (
                                        <span className="text-muted-foreground ml-1">
                                          {formatLapTime(lap.lapTime)}
                                        </span>
                                      )}
                                      {isCurrentLap && (
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Badge variant="default" className="ml-auto h-3.5 text-[9px] px-1 bg-purple-600">
                                              Current
                                            </Badge>
                                          </TooltipTrigger>
                                          <TooltipContent side="right">Currently recording lap</TooltipContent>
                                        </Tooltip>
                                      )}
                                    </button>
                                  );
                                })
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
