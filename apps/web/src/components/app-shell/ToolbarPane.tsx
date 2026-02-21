'use client';

import React, { useState, lazy, Suspense } from 'react';
import { Bot, Sliders, HelpCircle, Settings, User, BookOpen, Bug, ExternalLink } from 'lucide-react';
import { useAppShell } from './AppShellContext';
import { getToolbarItems } from '@/plugins';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { UserMenu } from '@/components/UserMenu';
import { SettingsDialog } from '@/components/settings/SettingsDialog';

const ChannelEditorContent = lazy(() => import('@/components/content/ChannelEditorContent'));

export function ToolbarPane() {
  const { state, toggleAgentPanel, openTab } = useAppShell();
  const pluginToolbarItems = getToolbarItems();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [channelEditorOpen, setChannelEditorOpen] = useState(false);

  const topItems = pluginToolbarItems.filter((i) => i.position === 'top');
  const bottomItems = pluginToolbarItems.filter((i) => i.position === 'bottom');

  function handleChannelEditor() {
    setChannelEditorOpen(true);
  }

  return (
    <>
    <TooltipProvider delayDuration={300}>
      <div className="flex flex-col items-center justify-between w-10 bg-gray-100 dark:bg-gray-800 border-l shrink-0">
        {/* Top section */}
        <div className="flex flex-col items-center">
          {/* Built-in: AI Agent toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={toggleAgentPanel}
                className={`flex items-center justify-center w-10 h-10 transition-colors ${
                  state.agentPanelOpen
                    ? 'bg-gray-200 dark:bg-gray-700 text-purple-600'
                    : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-muted-foreground'
                }`}
                aria-label="AI Agent"
              >
                <Bot className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left">AI Agent</TooltipContent>
          </Tooltip>

          {/* Built-in: Channel Editor */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleChannelEditor}
                className="flex items-center justify-center w-10 h-10 hover:bg-gray-200 dark:hover:bg-gray-700 text-muted-foreground transition-colors"
                aria-label="Channel Editor"
              >
                <Sliders className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left">Channel Editor</TooltipContent>
          </Tooltip>

          {/* Plugin toolbar items (top) */}
          {topItems.map((item) => {
            const Icon = item.icon;
            return (
              <Tooltip key={item.id}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => {
                      if (item.renderPanel) {
                        toggleAgentPanel();
                      } else if (item.onClick) {
                        item.onClick({ openTab });
                      }
                    }}
                    className="flex items-center justify-center w-10 h-10 hover:bg-gray-200 dark:hover:bg-gray-700 text-muted-foreground transition-colors"
                    aria-label={item.label}
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left">{item.label}</TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        {/* Bottom section */}
        <div className="flex flex-col items-center">
          {/* Plugin toolbar items (bottom) */}
          {bottomItems.map((item) => {
            const Icon = item.icon;
            return (
              <Tooltip key={item.id}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => item.onClick?.({ openTab })}
                    className="flex items-center justify-center w-10 h-10 hover:bg-gray-200 dark:hover:bg-gray-700 text-muted-foreground transition-colors"
                    aria-label={item.label}
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left">{item.label}</TooltipContent>
              </Tooltip>
            );
          })}

          {/* Built-in: Help */}
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <button
                    className="flex items-center justify-center w-10 h-10 hover:bg-gray-200 dark:hover:bg-gray-700 text-muted-foreground transition-colors"
                    aria-label="Help"
                  >
                    <HelpCircle className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="left">Help</TooltipContent>
            </Tooltip>
            <DropdownMenuContent side="left" align="end">
              <DropdownMenuItem asChild>
                <a
                  href="https://chrismarth.github.io/PurpleSector/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <BookOpen className="h-4 w-4" />
                  Documentation
                  <ExternalLink className="h-3 w-3 ml-auto opacity-50" />
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a
                  href="https://github.com/chrismarth/PurpleSector/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Bug className="h-4 w-4" />
                  Report Bug
                  <ExternalLink className="h-3 w-3 ml-auto opacity-50" />
                </a>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Built-in: Settings */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setSettingsOpen(true)}
                className="flex items-center justify-center w-10 h-10 hover:bg-gray-200 dark:hover:bg-gray-700 text-muted-foreground transition-colors"
                aria-label="Settings"
              >
                <Settings className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left">Settings</TooltipContent>
          </Tooltip>

          {/* Built-in: User Avatar */}
          <div className="flex items-center justify-center w-10 h-10">
            <UserMenu compact />
          </div>
        </div>
      </div>

    </TooltipProvider>
    <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    <Dialog open={channelEditorOpen} onOpenChange={setChannelEditorOpen}>
      <DialogContent className="max-w-5xl h-[80vh] p-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-4 py-2 border-b bg-muted/40 shrink-0">
          <DialogTitle className="text-sm font-semibold">Channel Library</DialogTitle>
          <DialogDescription className="sr-only">View raw telemetry channels and manage math channels</DialogDescription>
        </DialogHeader>
        <div className="flex-1 min-h-0">
          <Suspense fallback={<div className="flex items-center justify-center h-full text-muted-foreground">Loading...</div>}>
            <ChannelEditorContent />
          </Suspense>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
