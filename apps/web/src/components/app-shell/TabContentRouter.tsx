'use client';

import React from 'react';
import type { TabDescriptor } from '@purplesector/plugin-api';
import { getContentTabByType } from '@/plugins';

// Built-in content components (lazy-loaded)
const EventDetailContent = React.lazy(() => import('@/components/content/EventDetailContent'));
const EventEditContent = React.lazy(() => import('@/components/content/EventEditContent'));
const EventNewContent = React.lazy(() => import('@/components/content/EventNewContent'));
const SessionDetailContent = React.lazy(() => import('@/components/content/SessionDetailContent'));
const SessionEditContent = React.lazy(() => import('@/components/content/SessionEditContent'));
const SessionNewContent = React.lazy(() => import('@/components/content/SessionNewContent'));
const LapDetailContent = React.lazy(() => import('@/components/content/LapDetailContent'));
const RunPlanNewContent = React.lazy(() => import('@/components/content/RunPlanNewContent'));

interface TabContentRouterProps {
  tab: TabDescriptor;
}

export function TabContentRouter({ tab }: TabContentRouterProps) {
  const fallback = (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
    </div>
  );

  // Check plugin-registered content tabs first
  const pluginTab = getContentTabByType(tab.type);
  if (pluginTab) {
    return (
      <React.Suspense fallback={fallback}>
        {pluginTab.render({ entityId: tab.entityId, parentIds: tab.parentIds })}
      </React.Suspense>
    );
  }

  // Built-in tab types
  switch (tab.type) {
    case 'event-detail':
      return (
        <React.Suspense fallback={fallback}>
          <EventDetailContent entityId={tab.entityId!} />
        </React.Suspense>
      );
    case 'event-edit':
      return (
        <React.Suspense fallback={fallback}>
          <EventEditContent entityId={tab.entityId!} />
        </React.Suspense>
      );
    case 'event-new':
      return (
        <React.Suspense fallback={fallback}>
          <EventNewContent />
        </React.Suspense>
      );
    case 'session-detail':
      return (
        <React.Suspense fallback={fallback}>
          <SessionDetailContent entityId={tab.entityId!} />
        </React.Suspense>
      );
    case 'session-edit':
      return (
        <React.Suspense fallback={fallback}>
          <SessionEditContent entityId={tab.entityId!} />
        </React.Suspense>
      );
    case 'session-new':
      return (
        <React.Suspense fallback={fallback}>
          <SessionNewContent parentIds={tab.parentIds} />
        </React.Suspense>
      );
    case 'lap-detail':
      return (
        <React.Suspense fallback={fallback}>
          <LapDetailContent entityId={tab.entityId!} />
        </React.Suspense>
      );
    case 'run-plan-new':
      return (
        <React.Suspense fallback={fallback}>
          <RunPlanNewContent entityId={tab.entityId!} />
        </React.Suspense>
      );
    default:
      return (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          <p className="text-sm">Unknown tab type: {tab.type}</p>
        </div>
      );
  }
}
