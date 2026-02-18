'use client';

import * as React from 'react';
import { Check, X, Loader2, AlertCircle, ChevronRight } from 'lucide-react';

interface AgentPlanStep {
  id: string;
  toolName: string;
  args: Record<string, unknown>;
  description: string;
  status: 'pending' | 'running' | 'done' | 'failed';
  result?: unknown;
}

interface AgentPlan {
  id: string;
  steps: AgentPlanStep[];
  status: 'draft' | 'approved' | 'executing' | 'completed' | 'failed';
}

interface AgentPlanViewProps {
  plan: AgentPlan;
  onApprove: () => void;
  onReject: () => void;
  executing: boolean;
}

function getStepMessage(step: AgentPlanStep, fallback: string): string {
  if (!step.result) return fallback;
  const r = step.result as Record<string, unknown>;
  return typeof r.message === 'string' ? r.message : fallback;
}

export function AgentPlanView({ plan, onApprove, onReject, executing }: AgentPlanViewProps) {
  const isDraft = plan.status === 'draft';
  const isCompleted = plan.status === 'completed';
  const isFailed = plan.status === 'failed';

  return (
    <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <ChevronRight className="h-4 w-4" />
        Plan ({plan.steps.length} step{plan.steps.length !== 1 ? 's' : ''})
        {isCompleted && <span className="text-green-600 text-xs">(completed)</span>}
        {isFailed && <span className="text-red-600 text-xs">(failed)</span>}
      </div>

      <div className="space-y-1.5">
        {plan.steps.map((step, i) => (
          <div key={step.id} className="flex items-start gap-2 text-sm">
            <StepStatusIcon status={step.status} />
            <div className="flex-1 min-w-0">
              <div className="truncate">{String(i + 1)}. {String(step.description)}</div>
              {step.status === 'done' && step.result ? (
                <div className="text-xs text-muted-foreground mt-0.5">
                  {getStepMessage(step, 'Done')}
                </div>
              ) : null}
              {step.status === 'failed' && step.result ? (
                <div className="text-xs text-red-600 mt-0.5">
                  {getStepMessage(step, 'Failed')}
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      {isDraft && (
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={onApprove}
            disabled={executing}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {executing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
            Approve & Execute
          </button>
          <button
            onClick={onReject}
            disabled={executing}
            className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50"
          >
            <X className="h-3 w-3" />
            Reject
          </button>
        </div>
      )}
    </div>
  );
}

function StepStatusIcon({ status }: { status: AgentPlanStep['status'] }) {
  switch (status) {
    case 'done':
      return <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />;
    case 'failed':
      return <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />;
    case 'running':
      return <Loader2 className="h-4 w-4 text-blue-600 animate-spin mt-0.5 flex-shrink-0" />;
    default:
      return <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30 mt-0.5 flex-shrink-0" />;
  }
}
