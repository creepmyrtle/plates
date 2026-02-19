'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';
import type { Plate, PlanItemWithTask } from '@/lib/types';

interface Props {
  plates: Plate[];
  incompleteItems: PlanItemWithTask[];
}

interface PlateRating {
  plateId: string;
  rating: number;
  note: string;
}

export default function ReviewFlow({ plates, incompleteItems }: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Step 1: Mood
  const [mood, setMood] = useState(0);
  const [notes, setNotes] = useState('');

  // Step 2: Plate ratings
  const [plateRatings, setPlateRatings] = useState<PlateRating[]>(
    plates.map((p) => ({ plateId: p.id, rating: 0, note: '' }))
  );

  // Step 3: Incomplete task decisions
  const [taskDecisions, setTaskDecisions] = useState<Record<string, 'tomorrow' | 'drop'>>({});

  // Step 4: New tasks via quick add
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPlate, setNewTaskPlate] = useState(plates[0]?.id || '');
  const [addedTasks, setAddedTasks] = useState<{ title: string; plateName: string }[]>([]);

  const totalSteps = 5;
  const progress = ((step + 1) / totalSteps) * 100;

  const setPlateRating = useCallback((plateId: string, rating: number) => {
    setPlateRatings((prev) =>
      prev.map((r) => (r.plateId === plateId ? { ...r, rating } : r))
    );
  }, []);

  const setPlateNote = useCallback((plateId: string, note: string) => {
    setPlateRatings((prev) =>
      prev.map((r) => (r.plateId === plateId ? { ...r, note } : r))
    );
  }, []);

  const handleTaskDecision = useCallback((taskId: string, decision: 'tomorrow' | 'drop') => {
    setTaskDecisions((prev) => ({ ...prev, [taskId]: decision }));
  }, []);

  const handleAddTask = async () => {
    if (!newTaskTitle.trim() || !newTaskPlate) return;

    try {
      const res = await fetch('/api/tasks/quick-add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTaskTitle.trim(), plate_id: newTaskPlate }),
      });

      if (res.ok) {
        const plateName = plates.find((p) => p.id === newTaskPlate)?.name || '';
        setAddedTasks((prev) => [...prev, { title: newTaskTitle.trim(), plateName }]);
        setNewTaskTitle('');
        showToast('Task added', 'success');
      }
    } catch {
      showToast('Failed to add task', 'error');
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // 1. Submit review
      await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mood,
          notes: notes.trim() || undefined,
          plateRatings: plateRatings
            .filter((r) => r.rating > 0)
            .map((r) => ({
              plateId: r.plateId,
              rating: r.rating,
              note: r.note.trim() || undefined,
            })),
        }),
      });

      // 2. Handle incomplete task decisions
      for (const [taskId, decision] of Object.entries(taskDecisions)) {
        if (decision === 'drop') {
          await fetch(`/api/tasks/${taskId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'completed' }),
          });
        }
        // 'tomorrow' tasks are left pending — they'll be picked up by next plan generation
      }

      showToast('Review saved', 'success');
      router.push('/today');
    } catch {
      showToast('Failed to save review', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const moodEmojis = ['😫', '😔', '😐', '🙂', '😄'];
  const moodLabels = ['Rough', 'Tough', 'Okay', 'Good', 'Great'];

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
        {/* Step 1: Mood */}
        {step === 0 && (
          <div className="animate-fade-up">
            <StepHeader step={1} title="How was your day?" subtitle="Rate your overall mood for today." />

            <div className="mt-8 flex justify-center gap-4">
              {moodEmojis.map((emoji, i) => {
                const value = i + 1;
                return (
                  <button
                    key={value}
                    onClick={() => setMood(value)}
                    className={`flex flex-col items-center gap-2 rounded-xl p-3 transition-all ${
                      mood === value
                        ? 'bg-accent/15 scale-110'
                        : 'hover:bg-bg-card'
                    }`}
                  >
                    <span className="text-3xl">{emoji}</span>
                    <span className={`text-xs ${mood === value ? 'text-accent font-semibold' : 'text-text-secondary'}`}>
                      {moodLabels[i]}
                    </span>
                  </button>
                );
              })}
            </div>

            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any notes about your day? (optional)"
              rows={3}
              className="mt-6 w-full rounded-lg border border-border bg-bg-card px-4 py-3 text-sm text-text-primary placeholder:text-text-secondary focus:border-accent focus:outline-none resize-none"
            />

            <div className="mt-8">
              <button
                onClick={() => setStep(1)}
                disabled={mood === 0}
                className="w-full rounded-lg bg-accent py-3 text-sm font-semibold text-white disabled:opacity-40"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Plate Ratings */}
        {step === 1 && (
          <div className="animate-fade-up">
            <StepHeader step={2} title="Plate Check-in" subtitle="How did each area of your life feel today?" />

            <div className="mt-6 space-y-4">
              {plates.map((plate) => {
                const rating = plateRatings.find((r) => r.plateId === plate.id);
                return (
                  <div key={plate.id} className="rounded-lg border border-border bg-bg-card p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: plate.color }} />
                      <span className="font-medium text-sm">{plate.name}</span>
                    </div>

                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((value) => (
                        <button
                          key={value}
                          onClick={() => setPlateRating(plate.id, value)}
                          className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-mono font-semibold transition-all ${
                            rating?.rating === value
                              ? 'text-white'
                              : 'border border-border text-text-secondary hover:border-border-hover'
                          }`}
                          style={rating?.rating === value ? { backgroundColor: plate.color } : undefined}
                        >
                          {value}
                        </button>
                      ))}
                    </div>

                    <input
                      type="text"
                      value={rating?.note || ''}
                      onChange={(e) => setPlateNote(plate.id, e.target.value)}
                      placeholder="Quick note (optional)"
                      className="mt-2 w-full rounded border border-border bg-bg-secondary px-3 py-1.5 text-xs text-text-primary placeholder:text-text-secondary focus:border-accent focus:outline-none"
                    />
                  </div>
                );
              })}
            </div>

            <NavButtons onBack={() => setStep(0)} onNext={() => setStep(2)} />
          </div>
        )}

        {/* Step 3: Incomplete Tasks */}
        {step === 2 && (
          <div className="animate-fade-up">
            <StepHeader
              step={3}
              title="Incomplete Tasks"
              subtitle={incompleteItems.length > 0
                ? "What should we do with these?"
                : "All tasks done — nothing to carry over!"}
            />

            <div className="mt-6 space-y-2">
              {incompleteItems.map((item) => {
                const decision = taskDecisions[item.task_id];
                return (
                  <div
                    key={item.id}
                    className="rounded-lg border border-border bg-bg-card p-3"
                    style={{ borderLeftWidth: '3px', borderLeftColor: item.plate_color }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-medium">{item.task.title}</span>
                        <span className="ml-2 text-xs text-text-secondary">{item.plate_name}</span>
                      </div>
                    </div>
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => handleTaskDecision(item.task_id, 'tomorrow')}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                          decision === 'tomorrow'
                            ? 'bg-accent text-white'
                            : 'border border-border text-text-secondary hover:text-text-primary'
                        }`}
                      >
                        Do Tomorrow
                      </button>
                      <button
                        onClick={() => handleTaskDecision(item.task_id, 'drop')}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                          decision === 'drop'
                            ? 'bg-danger text-white'
                            : 'border border-border text-text-secondary hover:text-text-primary'
                        }`}
                      >
                        Drop It
                      </button>
                    </div>
                  </div>
                );
              })}

              {incompleteItems.length === 0 && (
                <div className="rounded-lg border border-success/30 bg-success/5 p-6 text-center">
                  <span className="text-2xl">✨</span>
                  <p className="mt-1 text-sm text-success font-medium">Everything complete!</p>
                </div>
              )}
            </div>

            <NavButtons onBack={() => setStep(1)} onNext={() => setStep(3)} />
          </div>
        )}

        {/* Step 4: Quick-Add New Tasks */}
        {step === 3 && (
          <div className="animate-fade-up">
            <StepHeader step={4} title="Anything New?" subtitle="Add tasks that came to mind today. Or skip ahead." />

            <div className="mt-6">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddTask(); }}
                  placeholder="New task..."
                  className="flex-1 rounded-lg border border-border bg-bg-card px-3 py-2.5 text-sm text-text-primary placeholder:text-text-secondary focus:border-accent focus:outline-none"
                />
                <button
                  onClick={handleAddTask}
                  disabled={!newTaskTitle.trim()}
                  className="rounded-lg bg-accent px-4 text-sm font-semibold text-white disabled:opacity-40"
                >
                  Add
                </button>
              </div>

              {plates.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {plates.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setNewTaskPlate(p.id)}
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                        newTaskPlate === p.id
                          ? 'border-transparent text-white'
                          : 'border-border text-text-secondary'
                      }`}
                      style={newTaskPlate === p.id ? { backgroundColor: p.color } : undefined}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              )}

              {addedTasks.length > 0 && (
                <div className="mt-4 space-y-1.5">
                  <p className="text-xs text-text-secondary font-medium">Added:</p>
                  {addedTasks.map((t, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <svg className="w-3.5 h-3.5 text-success" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                      <span>{t.title}</span>
                      <span className="text-text-secondary">({t.plateName})</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <NavButtons onBack={() => setStep(2)} onNext={() => setStep(4)} nextLabel="Continue" />
          </div>
        )}

        {/* Step 5: Summary & Submit */}
        {step === 4 && (
          <div className="animate-fade-up">
            <StepHeader step={5} title="Review Summary" subtitle="Here's your check-in for today." />

            <div className="mt-6 space-y-4">
              {/* Mood */}
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Mood</h3>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-2xl">{moodEmojis[mood - 1]}</span>
                  <span className="font-medium">{moodLabels[mood - 1]}</span>
                </div>
                {notes && <p className="mt-1 text-xs text-text-secondary">{notes}</p>}
              </div>

              {/* Plate ratings */}
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Plate Ratings</h3>
                <div className="mt-2 space-y-1.5">
                  {plateRatings.filter((r) => r.rating > 0).map((r) => {
                    const plate = plates.find((p) => p.id === r.plateId);
                    if (!plate) return null;
                    return (
                      <div key={r.plateId} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: plate.color }} />
                          <span>{plate.name}</span>
                        </div>
                        <span className="font-mono font-semibold">{r.rating}/5</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Decisions */}
              {Object.keys(taskDecisions).length > 0 && (
                <div className="rounded-lg border border-border bg-bg-card p-4">
                  <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Task Decisions</h3>
                  <div className="mt-2 space-y-1">
                    {Object.entries(taskDecisions).map(([taskId, decision]) => {
                      const item = incompleteItems.find((i) => i.task_id === taskId);
                      if (!item) return null;
                      return (
                        <div key={taskId} className="flex items-center justify-between text-xs">
                          <span>{item.task.title}</span>
                          <span className={decision === 'drop' ? 'text-danger' : 'text-accent'}>
                            {decision === 'drop' ? 'Dropped' : 'Tomorrow'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8 space-y-3">
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full rounded-lg bg-accent py-3.5 text-sm font-semibold text-white transition-transform active:scale-[0.98] disabled:opacity-60"
              >
                {submitting ? 'Saving...' : 'Save Review'}
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={submitting}
                className="w-full rounded-lg border border-border py-2.5 text-sm text-text-secondary hover:text-text-primary transition-colors disabled:opacity-40"
              >
                Back
              </button>
            </div>
          </div>
        )}
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
}: {
  onBack: () => void;
  onNext: () => void;
  nextLabel?: string;
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
        className="flex-1 rounded-lg bg-accent py-3 text-sm font-semibold text-white transition-transform active:scale-[0.98]"
      >
        {nextLabel}
      </button>
    </div>
  );
}
