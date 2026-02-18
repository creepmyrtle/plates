'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';
import {
  SUGGESTED_PILLARS,
  SUGGESTED_TASKS,
  TIMEZONES,
  DAY_LABELS,
  type SuggestedPillar,
  type SuggestedTask,
} from '@/lib/onboarding-data';
import type { RecurrenceRule } from '@/lib/types';

// --- Types ---

interface SelectedPillar extends SuggestedPillar {
  id?: string; // set after creation
  selectedTasks: SelectedTask[];
}

interface SelectedTask {
  title: string;
  recurrence: 'one-time' | 'daily' | 'weekly' | 'custom';
  days?: number[];
  selected: boolean;
}

interface Schedule {
  wake_time: string;
  sleep_time: string;
  work_start_time: string;
  work_end_time: string;
  work_days: number[];
  timezone: string;
  review_time: string;
}

// --- Component ---

export default function OnboardingWizard() {
  const router = useRouter();
  const { showToast } = useToast();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Step 2: Pillars
  const [selectedPillars, setSelectedPillars] = useState<SelectedPillar[]>([]);

  // Step 4: Schedule
  const [schedule, setSchedule] = useState<Schedule>({
    wake_time: '06:30',
    sleep_time: '22:30',
    work_start_time: '08:00',
    work_end_time: '17:00',
    work_days: [1, 2, 3, 4, 5],
    timezone: 'America/Chicago',
    review_time: '21:00',
  });

  const totalSteps = 5;
  const progress = ((step + 1) / totalSteps) * 100;

  // --- Pillar selection ---

  const togglePillar = useCallback((pillar: SuggestedPillar) => {
    setSelectedPillars((prev) => {
      const existing = prev.find((p) => p.name === pillar.name);
      if (existing) {
        return prev.filter((p) => p.name !== pillar.name);
      }
      // Add with suggested tasks pre-selected
      const suggestions = SUGGESTED_TASKS[pillar.name] || [];
      return [
        ...prev,
        {
          ...pillar,
          selectedTasks: suggestions.map((t) => ({ ...t, selected: true })),
        },
      ];
    });
  }, []);

  // --- Task selection ---

  const toggleTask = useCallback((pillarName: string, taskTitle: string) => {
    setSelectedPillars((prev) =>
      prev.map((p) => {
        if (p.name !== pillarName) return p;
        return {
          ...p,
          selectedTasks: p.selectedTasks.map((t) =>
            t.title === taskTitle ? { ...t, selected: !t.selected } : t
          ),
        };
      })
    );
  }, []);

  const addCustomTask = useCallback((pillarName: string, title: string) => {
    setSelectedPillars((prev) =>
      prev.map((p) => {
        if (p.name !== pillarName) return p;
        return {
          ...p,
          selectedTasks: [
            ...p.selectedTasks,
            { title, recurrence: 'one-time', selected: true },
          ],
        };
      })
    );
  }, []);

  // --- Schedule ---

  const toggleWorkDay = useCallback((day: number) => {
    setSchedule((prev) => ({
      ...prev,
      work_days: prev.work_days.includes(day)
        ? prev.work_days.filter((d) => d !== day)
        : [...prev.work_days, day].sort((a, b) => a - b),
    }));
  }, []);

  // --- Submit ---

  const handleFinish = async () => {
    setSubmitting(true);
    try {
      // 1. Update user schedule
      await fetch('/api/user', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(schedule),
      });

      // 2. Create pillars and tasks
      for (const pillar of selectedPillars) {
        const pillarRes = await fetch('/api/pillars', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: pillar.name,
            color: pillar.color,
            type: pillar.type,
            description: pillar.description,
            icon: pillar.icon,
          }),
        });

        if (!pillarRes.ok) continue;
        const { data: createdPillar } = await pillarRes.json();

        // Create selected tasks
        const tasksToCreate = pillar.selectedTasks.filter((t) => t.selected);
        for (const task of tasksToCreate) {
          const isRecurring = task.recurrence !== 'one-time';
          let recurrenceRule: RecurrenceRule | undefined;

          if (task.recurrence === 'daily') {
            recurrenceRule = { pattern: 'daily' };
          } else if (task.recurrence === 'weekly' && task.days) {
            recurrenceRule = { pattern: 'weekly', days: task.days };
          }

          await fetch('/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              pillar_id: createdPillar.id,
              title: task.title,
              is_recurring: isRecurring,
              recurrence_rule: recurrenceRule,
            }),
          });
        }
      }

      // 3. Mark onboarding complete
      await fetch('/api/user/onboard', { method: 'POST' });

      showToast('Welcome to Plates!', 'success');
      router.push('/today');
    } catch {
      showToast('Something went wrong. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-bg-primary">
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-bg-secondary">
        <div
          className="h-full bg-accent transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mx-auto w-full max-w-lg flex-1 px-4 pt-12 pb-8">
        {step === 0 && <StepWelcome onNext={() => setStep(1)} />}
        {step === 1 && (
          <StepPillars
            selected={selectedPillars}
            onToggle={togglePillar}
            onBack={() => setStep(0)}
            onNext={() => setStep(2)}
          />
        )}
        {step === 2 && (
          <StepTasks
            pillars={selectedPillars}
            onToggleTask={toggleTask}
            onAddCustomTask={addCustomTask}
            onBack={() => setStep(1)}
            onNext={() => setStep(3)}
          />
        )}
        {step === 3 && (
          <StepSchedule
            schedule={schedule}
            onUpdate={setSchedule}
            onToggleDay={toggleWorkDay}
            onBack={() => setStep(2)}
            onNext={() => setStep(4)}
          />
        )}
        {step === 4 && (
          <StepReady
            pillars={selectedPillars}
            schedule={schedule}
            submitting={submitting}
            onBack={() => setStep(3)}
            onFinish={handleFinish}
          />
        )}
      </div>
    </div>
  );
}

// ==========================================================================
// Step Components
// ==========================================================================

function StepWelcome({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center text-center pt-16 animate-fade-up">
      <div className="text-6xl mb-6">🍽️</div>
      <h1 className="text-3xl font-bold tracking-tight">
        Welcome to <span className="text-accent">Plates</span>
      </h1>
      <p className="mt-4 text-lg text-text-secondary leading-relaxed max-w-sm">
        Every area of your life is a plate. Drop your attention from one too long and it wobbles.
      </p>
      <p className="mt-3 text-text-secondary leading-relaxed max-w-sm">
        Plates helps you see which ones need attention and guides your daily actions to keep them all spinning.
      </p>
      <p className="mt-6 text-sm text-text-secondary">Let&apos;s set up your plates.</p>
      <button
        onClick={onNext}
        className="mt-8 w-full max-w-xs rounded-lg bg-accent py-3.5 text-sm font-semibold text-white transition-transform active:scale-[0.98]"
      >
        Get Started
      </button>
    </div>
  );
}

function StepPillars({
  selected,
  onToggle,
  onBack,
  onNext,
}: {
  selected: SelectedPillar[];
  onToggle: (p: SuggestedPillar) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <div className="animate-fade-up">
      <StepHeader
        step={2}
        title="Your Life Pillars"
        subtitle="Select the areas of your life you want to manage. You can always add more later."
      />

      <div className="mt-6 grid grid-cols-1 gap-2">
        {SUGGESTED_PILLARS.map((pillar) => {
          const isSelected = selected.some((p) => p.name === pillar.name);
          return (
            <button
              key={pillar.name}
              onClick={() => onToggle(pillar)}
              className={`flex items-center gap-3 rounded-lg border p-3.5 text-left transition-all ${
                isSelected
                  ? 'border-accent bg-accent/10'
                  : 'border-border bg-bg-card hover:border-border-hover'
              }`}
            >
              <span className="text-xl">{pillar.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{pillar.name}</span>
                  {pillar.type === 'goal' && (
                    <span className="rounded bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold text-accent">
                      GOAL
                    </span>
                  )}
                </div>
                <p className="text-xs text-text-secondary mt-0.5">{pillar.description}</p>
              </div>
              <div
                className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                  isSelected ? 'border-accent bg-accent' : 'border-text-secondary'
                }`}
              >
                {isSelected && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <NavButtons
        onBack={onBack}
        onNext={onNext}
        nextDisabled={selected.length === 0}
        nextLabel={`Continue with ${selected.length} pillar${selected.length !== 1 ? 's' : ''}`}
      />
    </div>
  );
}

function StepTasks({
  pillars,
  onToggleTask,
  onAddCustomTask,
  onBack,
  onNext,
}: {
  pillars: SelectedPillar[];
  onToggleTask: (pillarName: string, taskTitle: string) => void;
  onAddCustomTask: (pillarName: string, title: string) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const [customInputs, setCustomInputs] = useState<Record<string, string>>({});
  const [expandedPillar, setExpandedPillar] = useState<string>(pillars[0]?.name || '');

  const handleAddCustom = (pillarName: string) => {
    const title = customInputs[pillarName]?.trim();
    if (!title) return;
    onAddCustomTask(pillarName, title);
    setCustomInputs((prev) => ({ ...prev, [pillarName]: '' }));
  };

  const totalTasks = pillars.reduce((acc, p) => acc + p.selectedTasks.filter((t) => t.selected).length, 0);

  return (
    <div className="animate-fade-up">
      <StepHeader
        step={3}
        title="Add Some Tasks"
        subtitle="We've suggested common tasks for each pillar. Toggle them on or off, or add your own."
      />

      <div className="mt-6 space-y-3">
        {pillars.map((pillar) => {
          const isExpanded = expandedPillar === pillar.name;
          const selectedCount = pillar.selectedTasks.filter((t) => t.selected).length;

          return (
            <div key={pillar.name} className="rounded-lg border border-border bg-bg-card overflow-hidden">
              <button
                onClick={() => setExpandedPillar(isExpanded ? '' : pillar.name)}
                className="flex w-full items-center gap-3 p-3.5 text-left"
              >
                <span>{pillar.icon}</span>
                <span className="flex-1 font-medium text-sm">{pillar.name}</span>
                <span className="text-xs text-text-secondary font-mono">{selectedCount} tasks</span>
                <svg
                  className={`w-4 h-4 text-text-secondary transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                </svg>
              </button>

              {isExpanded && (
                <div className="border-t border-border px-3.5 pb-3.5">
                  <div className="mt-2 space-y-1">
                    {pillar.selectedTasks.map((task) => (
                      <TaskToggle
                        key={task.title}
                        task={task}
                        onToggle={() => onToggleTask(pillar.name, task.title)}
                      />
                    ))}
                  </div>

                  {/* Custom task input */}
                  <div className="mt-2 flex gap-2">
                    <input
                      type="text"
                      value={customInputs[pillar.name] || ''}
                      onChange={(e) =>
                        setCustomInputs((prev) => ({ ...prev, [pillar.name]: e.target.value }))
                      }
                      onKeyDown={(e) => { if (e.key === 'Enter') handleAddCustom(pillar.name); }}
                      placeholder="Add custom task..."
                      className="flex-1 rounded border border-border bg-bg-secondary px-3 py-1.5 text-xs text-text-primary placeholder:text-text-secondary focus:border-accent focus:outline-none"
                    />
                    <button
                      onClick={() => handleAddCustom(pillar.name)}
                      disabled={!customInputs[pillar.name]?.trim()}
                      className="rounded bg-accent/15 px-3 py-1.5 text-xs font-medium text-accent disabled:opacity-30"
                    >
                      Add
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <NavButtons
        onBack={onBack}
        onNext={onNext}
        nextLabel={`Continue with ${totalTasks} task${totalTasks !== 1 ? 's' : ''}`}
      />
    </div>
  );
}

function TaskToggle({ task, onToggle }: { task: SelectedTask; onToggle: () => void }) {
  const recurrenceLabel = {
    'one-time': 'One-time',
    daily: 'Daily',
    weekly: task.days ? `${task.days.map((d) => DAY_LABELS[d]).join(', ')}` : 'Weekly',
    custom: 'Custom',
  };

  return (
    <button
      onClick={onToggle}
      className={`flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left transition-colors ${
        task.selected ? 'bg-accent/5' : 'opacity-50'
      }`}
    >
      <div
        className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border transition-colors ${
          task.selected ? 'border-accent bg-accent' : 'border-text-secondary'
        }`}
      >
        {task.selected && (
          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        )}
      </div>
      <span className="flex-1 text-xs">{task.title}</span>
      <span className="text-[10px] text-text-secondary">{recurrenceLabel[task.recurrence]}</span>
    </button>
  );
}

function StepSchedule({
  schedule,
  onUpdate,
  onToggleDay,
  onBack,
  onNext,
}: {
  schedule: Schedule;
  onUpdate: (s: Schedule) => void;
  onToggleDay: (day: number) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const updateField = (field: keyof Schedule, value: string) => {
    onUpdate({ ...schedule, [field]: value });
  };

  return (
    <div className="animate-fade-up">
      <StepHeader
        step={4}
        title="Your Schedule"
        subtitle="Help us plan your days by telling us about your typical schedule."
      />

      <div className="mt-6 space-y-5">
        {/* Wake / Sleep */}
        <div className="grid grid-cols-2 gap-3">
          <TimeField label="Wake up" value={schedule.wake_time} onChange={(v) => updateField('wake_time', v)} />
          <TimeField label="Bedtime" value={schedule.sleep_time} onChange={(v) => updateField('sleep_time', v)} />
        </div>

        {/* Work hours */}
        <div className="grid grid-cols-2 gap-3">
          <TimeField label="Work starts" value={schedule.work_start_time} onChange={(v) => updateField('work_start_time', v)} />
          <TimeField label="Work ends" value={schedule.work_end_time} onChange={(v) => updateField('work_end_time', v)} />
        </div>

        {/* Work days */}
        <div>
          <label className="text-xs font-medium text-text-secondary">Work days</label>
          <div className="mt-2 flex gap-1.5">
            {DAY_LABELS.map((label, i) => (
              <button
                key={i}
                onClick={() => onToggleDay(i)}
                className={`flex h-10 w-10 items-center justify-center rounded-lg text-xs font-medium transition-colors ${
                  schedule.work_days.includes(i)
                    ? 'bg-accent text-white'
                    : 'border border-border text-text-secondary hover:border-border-hover'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Timezone */}
        <div>
          <label className="text-xs font-medium text-text-secondary">Timezone</label>
          <select
            value={schedule.timezone}
            onChange={(e) => updateField('timezone', e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-bg-card px-3 py-2.5 text-sm text-text-primary focus:border-accent focus:outline-none"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>

        {/* Review time */}
        <TimeField
          label="Nightly review time"
          value={schedule.review_time}
          onChange={(v) => updateField('review_time', v)}
        />
      </div>

      <NavButtons onBack={onBack} onNext={onNext} />
    </div>
  );
}

function StepReady({
  pillars,
  schedule,
  submitting,
  onBack,
  onFinish,
}: {
  pillars: SelectedPillar[];
  schedule: Schedule;
  submitting: boolean;
  onBack: () => void;
  onFinish: () => void;
}) {
  const totalTasks = pillars.reduce((acc, p) => acc + p.selectedTasks.filter((t) => t.selected).length, 0);

  return (
    <div className="animate-fade-up">
      <StepHeader
        step={5}
        title="You're All Set!"
        subtitle="Here's a summary of your setup. You can always change these later in Settings."
      />

      <div className="mt-6 space-y-4">
        {/* Pillars summary */}
        <div className="rounded-lg border border-border bg-bg-card p-4">
          <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Pillars</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {pillars.map((p) => (
              <span
                key={p.name}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-white"
                style={{ backgroundColor: p.color }}
              >
                {p.icon} {p.name}
              </span>
            ))}
          </div>
        </div>

        {/* Tasks summary */}
        <div className="rounded-lg border border-border bg-bg-card p-4">
          <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Tasks</h3>
          <p className="mt-1 text-sm font-mono">
            <span className="text-text-primary font-semibold">{totalTasks}</span> tasks across{' '}
            <span className="text-text-primary font-semibold">{pillars.length}</span> pillars
          </p>
        </div>

        {/* Schedule summary */}
        <div className="rounded-lg border border-border bg-bg-card p-4">
          <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Schedule</h3>
          <div className="mt-2 grid grid-cols-2 gap-y-1.5 text-xs">
            <span className="text-text-secondary">Wake up</span>
            <span className="font-mono">{schedule.wake_time}</span>
            <span className="text-text-secondary">Bedtime</span>
            <span className="font-mono">{schedule.sleep_time}</span>
            <span className="text-text-secondary">Work</span>
            <span className="font-mono">{schedule.work_start_time} – {schedule.work_end_time}</span>
            <span className="text-text-secondary">Work days</span>
            <span className="font-mono">{schedule.work_days.map((d) => DAY_LABELS[d]).join(', ')}</span>
            <span className="text-text-secondary">Review</span>
            <span className="font-mono">{schedule.review_time}</span>
          </div>
        </div>
      </div>

      <div className="mt-8 space-y-3">
        <button
          onClick={onFinish}
          disabled={submitting}
          className="w-full rounded-lg bg-accent py-3.5 text-sm font-semibold text-white transition-transform active:scale-[0.98] disabled:opacity-60"
        >
          {submitting ? 'Setting things up...' : 'Generate Your First Daily Plan'}
        </button>
        <button
          onClick={onBack}
          disabled={submitting}
          className="w-full rounded-lg border border-border py-2.5 text-sm text-text-secondary hover:text-text-primary transition-colors disabled:opacity-40"
        >
          Back
        </button>
      </div>
    </div>
  );
}

// ==========================================================================
// Shared helpers
// ==========================================================================

function StepHeader({ step, title, subtitle }: { step: number; title: string; subtitle: string }) {
  return (
    <div>
      <span className="text-xs font-semibold text-accent">STEP {step} OF 5</span>
      <h2 className="mt-1 text-2xl font-bold">{title}</h2>
      <p className="mt-1 text-sm text-text-secondary">{subtitle}</p>
    </div>
  );
}

function NavButtons({
  onBack,
  onNext,
  nextLabel = 'Continue',
  nextDisabled = false,
}: {
  onBack: () => void;
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
}) {
  return (
    <div className="mt-8 flex gap-3">
      <button
        onClick={onBack}
        className="rounded-lg border border-border px-6 py-3 text-sm text-text-secondary hover:text-text-primary transition-colors"
      >
        Back
      </button>
      <button
        onClick={onNext}
        disabled={nextDisabled}
        className="flex-1 rounded-lg bg-accent py-3 text-sm font-semibold text-white transition-transform active:scale-[0.98] disabled:opacity-40"
      >
        {nextLabel}
      </button>
    </div>
  );
}

function TimeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-text-secondary">{label}</label>
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-border bg-bg-card px-3 py-2.5 text-sm font-mono text-text-primary focus:border-accent focus:outline-none"
      />
    </div>
  );
}
