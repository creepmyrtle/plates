'use client';

import { useState, useCallback } from 'react';
import { useToast } from '@/components/Toast';
import TaskCard from '@/components/TaskCard';
import type { DailyPlan, PlanItemWithTask } from '@/lib/types';

interface Props {
  initialPlan: DailyPlan | null;
  initialItems: PlanItemWithTask[];
  date: string;
}

const DAY_TYPE_LABELS: Record<string, string> = {
  workday: 'Workday',
  weekend: 'Weekend',
  holiday: 'Holiday',
  day_off: 'Day Off',
};

export default function TodayView({ initialPlan, initialItems, date }: Props) {
  const { showToast } = useToast();
  const [plan, setPlan] = useState(initialPlan);
  const [items, setItems] = useState(initialItems);
  const [generating, setGenerating] = useState(false);

  const completedCount = items.filter((i) => i.completed || i.skipped).length;
  const totalCount = items.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const allDone = totalCount > 0 && completedCount === totalCount;

  // Group items by context
  const groups = groupByContext(items);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/plans/generate', { method: 'POST' });
      if (res.ok) {
        const { data } = await res.json();
        setPlan(data.plan);
        setItems(data.items);
        showToast('Plan generated', 'success');
      } else {
        showToast('Failed to generate plan', 'error');
      }
    } catch {
      showToast('Failed to generate plan', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleAutoGenerate = async () => {
    // Auto-generate on first load if no plan
    setGenerating(true);
    try {
      const res = await fetch('/api/plans/today');
      if (res.ok) {
        const { data } = await res.json();
        setPlan(data.plan);
        setItems(data.items);
      }
    } catch { /* ignore */ }
    finally { setGenerating(false); }
  };

  const handleComplete = useCallback(async (taskId: string) => {
    const item = items.find((i) => i.task_id === taskId);
    if (!item || !plan) return;

    // Optimistic update
    setItems((prev) =>
      prev.map((i) =>
        i.id === item.id ? { ...i, completed: true, completed_at: new Date().toISOString() } : i
      )
    );

    try {
      await fetch(`/api/plans/${plan.id}/items/${item.id}/complete`, { method: 'POST' });
    } catch {
      // Revert on error
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, completed: false, completed_at: null } : i))
      );
      showToast('Failed to complete task', 'error');
    }
  }, [items, plan, showToast]);

  const handleSkip = useCallback(async (taskId: string) => {
    const item = items.find((i) => i.task_id === taskId);
    if (!item || !plan) return;

    // Optimistic update
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, skipped: true } : i))
    );

    try {
      await fetch(`/api/plans/${plan.id}/items/${item.id}/skip`, { method: 'POST' });
    } catch {
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, skipped: false } : i))
      );
      showToast('Failed to skip task', 'error');
    }
  }, [items, plan, showToast]);

  const formattedDate = new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="px-4 pt-6">
      {/* Date header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{formattedDate}</h1>
          {plan && (
            <span className="mt-0.5 inline-block rounded-full bg-bg-card px-2.5 py-0.5 text-xs font-medium text-text-secondary">
              {DAY_TYPE_LABELS[plan.day_type] || plan.day_type}
            </span>
          )}
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-accent hover:border-accent transition-colors disabled:opacity-40"
          title="Regenerate plan"
        >
          {generating ? (
            <span className="inline-flex items-center gap-1.5">
              <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              Generating...
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
              </svg>
              Regenerate
            </span>
          )}
        </button>
      </div>

      {/* Progress bar */}
      {totalCount > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-secondary">
              <span className="font-mono text-text-primary font-semibold">{completedCount}</span> of{' '}
              <span className="font-mono">{totalCount}</span> tasks done
            </span>
            <span className="font-mono text-text-secondary">{Math.round(progress)}%</span>
          </div>
          <div className="mt-1.5 h-2 rounded-full bg-bg-card overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ease-out ${
                allDone ? 'bg-success' : 'bg-accent'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* No plan state */}
      {!plan && !generating && (
        <div className="mt-12 text-center">
          <div className="text-4xl mb-4">📋</div>
          <h2 className="text-lg font-semibold">No plan for today</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Generate a daily plan based on your tasks and priorities.
          </p>
          <button
            onClick={handleAutoGenerate}
            className="mt-4 rounded-lg bg-accent px-6 py-2.5 text-sm font-semibold text-white transition-transform active:scale-[0.98]"
          >
            Generate Plan
          </button>
        </div>
      )}

      {/* All done state */}
      {allDone && totalCount > 0 && (
        <div className="mt-6 rounded-lg border border-success/30 bg-success/5 p-4 text-center animate-fade-up">
          <div className="text-2xl mb-1">🎉</div>
          <p className="font-semibold text-success">All plates spinning!</p>
          <p className="text-xs text-text-secondary mt-0.5">Enjoy your evening.</p>
        </div>
      )}

      {/* Context groups */}
      <div className="mt-5 space-y-5 pb-4">
        {groups.map((group) => (
          <ContextGroup
            key={group.label}
            label={group.label}
            items={group.items}
            onComplete={handleComplete}
            onSkip={handleSkip}
          />
        ))}
      </div>
    </div>
  );
}

// ==========================================================================
// Context Group
// ==========================================================================

function ContextGroup({
  label,
  items,
  onComplete,
  onSkip,
}: {
  label: string;
  items: PlanItemWithTask[];
  onComplete: (taskId: string) => void;
  onSkip: (taskId: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const doneCount = items.filter((i) => i.completed || i.skipped).length;

  return (
    <div>
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full items-center justify-between py-1"
      >
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
            {label}
          </h3>
          <span className="text-[10px] font-mono text-text-secondary">
            {doneCount}/{items.length}
          </span>
        </div>
        <svg
          className={`w-4 h-4 text-text-secondary transition-transform ${collapsed ? '' : 'rotate-180'}`}
          fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {!collapsed && (
        <div className="mt-1.5 space-y-2">
          {items.map((item) => (
            <TaskCard
              key={item.id}
              task={{
                ...item.task,
                // Override status if plan item is completed/skipped
                status: item.completed ? 'completed' : item.skipped ? 'completed' : item.task.status,
              }}
              pillarColor={item.pillar_color}
              pillarName={item.pillar_name}
              onComplete={!item.completed && !item.skipped ? onComplete : undefined}
              onSkip={!item.completed && !item.skipped ? onSkip : undefined}
              swipeEnabled={!item.completed && !item.skipped}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ==========================================================================
// Helpers
// ==========================================================================

function groupByContext(items: PlanItemWithTask[]): { label: string; items: PlanItemWithTask[] }[] {
  const map = new Map<string, PlanItemWithTask[]>();

  for (const item of items) {
    const label = item.context_group || 'Anywhere';
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(item);
  }

  // Sort groups: At Work, At Home, Errands, Anywhere
  const order = ['At Work', 'At Home', 'Errands', 'Anywhere'];
  const groups = Array.from(map.entries())
    .sort(([a], [b]) => {
      const ai = order.indexOf(a);
      const bi = order.indexOf(b);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    })
    .map(([label, groupItems]) => ({ label, items: groupItems }));

  return groups;
}
