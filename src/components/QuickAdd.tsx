'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { useToast } from '@/components/Toast';
import type { Pillar } from '@/lib/types';

export default function QuickAdd() {
  const pathname = usePathname();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [selectedPillar, setSelectedPillar] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('medium');
  const [pillars, setPillars] = useState<Pillar[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Hide on onboarding
  if (pathname?.startsWith('/onboarding')) return null;

  const fetchPillars = useCallback(async () => {
    try {
      const res = await fetch('/api/pillars');
      const json = await res.json();
      if (json.data) {
        setPillars(json.data);
        if (json.data.length > 0 && !selectedPillar) {
          setSelectedPillar(json.data[0].id);
        }
      }
    } catch { /* ignore */ }
  }, [selectedPillar]);

  useEffect(() => {
    if (open) {
      fetchPillars();
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, fetchPillars]);

  const handleSubmit = async () => {
    if (!title.trim() || !selectedPillar) return;
    setSubmitting(true);

    try {
      const res = await fetch('/api/tasks/quick-add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          pillar_id: selectedPillar,
          due_date: dueDate || undefined,
          priority,
        }),
      });

      if (res.ok) {
        showToast('Task added', 'success');
        setTitle('');
        setDueDate('');
        setPriority('medium');
        setOpen(false);
      } else {
        showToast('Failed to add task', 'error');
      }
    } catch {
      showToast('Failed to add task', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-accent shadow-lg shadow-accent/25 text-white transition-transform active:scale-95"
      >
        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </button>

      {/* Modal overlay */}
      {open && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div
            className="w-full max-w-lg rounded-t-2xl border-t border-border bg-bg-secondary p-6 animate-fade-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Quick Add Task</h2>
              <button
                onClick={() => setOpen(false)}
                className="rounded-full p-1 text-text-secondary hover:text-text-primary hover:bg-bg-card transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Title */}
            <input
              ref={inputRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
              placeholder="What needs to be done?"
              className="w-full rounded-lg border border-border bg-bg-card px-4 py-3 text-text-primary placeholder:text-text-secondary focus:border-accent focus:outline-none"
            />

            {/* Pillar chips */}
            {pillars.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {pillars.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPillar(p.id)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                      selectedPillar === p.id
                        ? 'border-transparent text-white'
                        : 'border-border text-text-secondary hover:border-border-hover'
                    }`}
                    style={selectedPillar === p.id ? { backgroundColor: p.color } : undefined}
                  >
                    {p.icon && <span className="mr-1">{p.icon}</span>}
                    {p.name}
                  </button>
                ))}
              </div>
            )}

            {/* Optional fields row */}
            <div className="mt-3 flex gap-2">
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="flex-1 rounded-lg border border-border bg-bg-card px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
              />
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="rounded-lg border border-border bg-bg-card px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={!title.trim() || !selectedPillar || submitting}
              className="mt-4 w-full rounded-lg bg-accent py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-40"
            >
              {submitting ? 'Adding...' : 'Add Task'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
