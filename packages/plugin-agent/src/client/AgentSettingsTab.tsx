'use client';

import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { Loader2, Check } from 'lucide-react';

const MODEL_OPTIONS = [
  { value: 'gpt-4', label: 'GPT-4' },
  { value: 'gpt-4o', label: 'GPT-4o' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
];

const PLAN_MODE_OPTIONS = [
  { value: 'auto', label: 'Auto', description: 'Plan mode for mutations, direct for reads' },
  { value: 'always', label: 'Always', description: 'Always require plan approval' },
  { value: 'never', label: 'Never', description: 'Execute all actions immediately' },
];

export function AgentSettingsTab() {
  const [agentModel, setAgentModel] = useState('gpt-4');
  const [agentPlanMode, setAgentPlanMode] = useState('auto');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/user/settings');
        if (!res.ok) return;
        const data = await res.json();
        const settingsData = data.data ? JSON.parse(data.data) : {};
        if (!cancelled) {
          setAgentModel(settingsData.agentModel || 'gpt-4');
          setAgentPlanMode(settingsData.agentPlanMode || 'auto');
          setLoaded(true);
        }
      } catch {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaved(false);
    try {
      // Fetch current settings to merge
      const getRes = await fetch('/api/user/settings');
      let existingData: Record<string, unknown> = {};
      if (getRes.ok) {
        const current = await getRes.json();
        existingData = current.data ? JSON.parse(current.data) : {};
      }

      const newData = { ...existingData, agentModel, agentPlanMode };

      await fetch('/api/user/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: JSON.stringify(newData) }),
      });

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  }, [agentModel, agentPlanMode]);

  if (!loaded) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-medium">AI Model</label>
        <select
          value={agentModel}
          onChange={(e) => setAgentModel(e.target.value)}
          className="block w-full max-w-xs rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {MODEL_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          Select the OpenAI model used by the AI agent.
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Plan Mode</label>
        <div className="space-y-2">
          {PLAN_MODE_OPTIONS.map((opt) => (
            <label key={opt.value} className="flex items-start gap-3 cursor-pointer">
              <input
                type="radio"
                name="planMode"
                value={opt.value}
                checked={agentPlanMode === opt.value}
                onChange={(e) => setAgentPlanMode(e.target.value)}
                className="mt-0.5"
              />
              <div>
                <div className="text-sm font-medium">{opt.label}</div>
                <div className="text-xs text-muted-foreground">{opt.description}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="pt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : saved ? (
            <Check className="h-4 w-4" />
          ) : null}
          {saved ? 'Saved' : 'Save settings'}
        </button>
      </div>

      <div className="border-t pt-4 mt-4">
        <p className="text-xs text-muted-foreground">
          The AI Agent requires an OpenAI API key set as the <code className="bg-muted px-1 rounded">OPENAI_API_KEY</code> environment variable.
        </p>
      </div>
    </div>
  );
}
