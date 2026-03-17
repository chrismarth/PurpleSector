'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Moon, Sun } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { fetchJson, mutationJson } from '@/lib/client-fetch';

export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);

  const userThemeQuery = useQuery({
    queryKey: ['userSettings', 'theme'] as const,
    queryFn: async (): Promise<{ theme: 'light' | 'dark' | null }> => {
      return fetchJson<{ theme: 'light' | 'dark' | null }>('/api/user/settings', {
        unauthorized: { kind: 'return_fallback' },
        fallback: { theme: null },
      }).catch(() => ({ theme: null }));
    },
    enabled: mounted,
  });

  const persistThemeMutation = useMutation({
    mutationFn: async (newTheme: 'light' | 'dark') => {
      await mutationJson('/api/user/settings', {
        method: 'PUT',
        body: { theme: newTheme },
        unauthorized: { kind: 'return_fallback' },
        fallback: undefined,
      });
    },
  });

  useEffect(() => {
    setMounted(true);
    // Check for saved theme preference or default to light
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');
    
    setTheme(initialTheme);
    applyTheme(initialTheme);
  }, []);

  useEffect(() => {
    const persisted = userThemeQuery.data?.theme;
    if (!persisted) return;
    setTheme(persisted);
    applyTheme(persisted);
    localStorage.setItem('theme', persisted);
  }, [userThemeQuery.data]);

  const applyTheme = (newTheme: 'light' | 'dark') => {
    const html = document.documentElement;
    if (newTheme === 'dark') {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
  };

  const toggleTheme = (checked: boolean) => {
    const newTheme = checked ? 'dark' : 'light';
    setTheme(newTheme);
    applyTheme(newTheme);
    localStorage.setItem('theme', newTheme);

    // Best-effort persistence
    persistThemeMutation.mutate(newTheme);
  };

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return (
      <div className="flex items-center gap-2">
        <Sun className="h-4 w-4 text-yellow-500" />
        <Switch disabled checked={false} />
        <Moon className="h-4 w-4 text-slate-400" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Sun className="h-4 w-4 text-yellow-500" />
      <Switch 
        checked={theme === 'dark'} 
        onCheckedChange={toggleTheme}
        aria-label="Toggle dark mode"
      />
      <Moon className="h-4 w-4 text-blue-400" />
    </div>
  );
}
