'use client';

import React from 'react';
import { Calendar, Menu } from 'lucide-react';
import { useAppShell } from './AppShellContext';
import { getNavTabs } from '@/plugins';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function NavTabBar() {
  const { state, toggleNav, setActiveNavTab } = useAppShell();
  const pluginNavTabs = getNavTabs();

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex flex-col items-center w-10 bg-gray-100 dark:bg-gray-800 border-r shrink-0">
        {/* Hamburger toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={toggleNav}
              className="flex items-center justify-center w-10 h-10 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              aria-label="Toggle navigation"
            >
              <Menu className="h-4 w-4 text-muted-foreground" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">
            {state.navCollapsed ? 'Show navigation' : 'Hide navigation'}
          </TooltipContent>
        </Tooltip>

        <div className="w-6 border-b border-gray-300 dark:border-gray-600 my-1" />

        {/* Built-in Events tab */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setActiveNavTab('events')}
              className={`flex items-center justify-center w-10 h-10 transition-colors ${
                state.activeNavTab === 'events' && !state.navCollapsed
                  ? 'bg-gray-200 dark:bg-gray-700 text-foreground border-l-2 border-purple-600'
                  : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-muted-foreground'
              }`}
              aria-label="Events"
            >
              <Calendar className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">Events</TooltipContent>
        </Tooltip>

        {/* Plugin-registered nav tabs */}
        {pluginNavTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <Tooltip key={tab.id}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => !tab.disabled && setActiveNavTab(tab.id)}
                  disabled={tab.disabled}
                  className={`flex items-center justify-center w-10 h-10 transition-colors ${
                    tab.disabled
                      ? 'text-muted-foreground/40 cursor-not-allowed'
                      : state.activeNavTab === tab.id && !state.navCollapsed
                        ? 'bg-gray-200 dark:bg-gray-700 text-foreground border-l-2 border-purple-600'
                        : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-muted-foreground'
                  }`}
                  aria-label={tab.label}
                >
                  <Icon className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                {tab.label}
                {tab.disabled && ' (coming soon)'}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
