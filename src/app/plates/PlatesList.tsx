'use client';

import { useState } from 'react';
import PlateCard from '@/components/PlateCard';
import type { PlateWithCounts } from '@/lib/types';
import { useToast } from '@/components/Toast';

const PLATE_COLORS = [
  '#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444',
  '#06B6D4', '#EC4899', '#6366F1', '#14B8A6',
];

interface PlatesListProps {
  initialPlates: PlateWithCounts[];
}

export default function PlatesList({ initialPlates }: PlatesListProps) {
  const { showToast } = useToast();
  const [plates, setPlates] = useState(initialPlates);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState(PLATE_COLORS[0]);
  const [type, setType] = useState<'ongoing' | 'goal'>('ongoing');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSubmitting(true);

    try {
      const res = await fetch('/api/plates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), color, type, description: description.trim() || undefined }),
      });

      if (res.ok) {
        const { data } = await res.json();
        setPlates((prev) => [...prev, { ...data, task_count: 0, pending_count: 0, completed_count: 0, health_score: null }]);
        setName('');
        setDescription('');
        setShowForm(false);
        showToast('Plate created', 'success');
      } else {
        showToast('Failed to create plate', 'error');
      }
    } catch {
      showToast('Failed to create plate', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-4 space-y-3">
      {plates.map((plate) => (
        <PlateCard key={plate.id} plate={plate} />
      ))}

      {plates.length === 0 && !showForm && (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-text-secondary">
          <p className="text-sm">No plates yet. Create your first life plate to get started.</p>
        </div>
      )}

      {showForm ? (
        <div className="rounded-lg border border-border bg-bg-card p-4 animate-fade-up">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
            placeholder="Plate name (e.g., Work, Family, Health)"
            className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:border-accent focus:outline-none"
            autoFocus
          />

          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            className="mt-2 w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:border-accent focus:outline-none"
          />

          {/* Color picker */}
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs text-text-secondary">Color:</span>
            {PLATE_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`h-6 w-6 rounded-full transition-transform ${color === c ? 'scale-125 ring-2 ring-white/30' : ''}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>

          {/* Type toggle */}
          <div className="mt-3 flex items-center gap-3">
            <span className="text-xs text-text-secondary">Type:</span>
            <button
              onClick={() => setType('ongoing')}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                type === 'ongoing' ? 'bg-accent text-white' : 'border border-border text-text-secondary'
              }`}
            >
              Ongoing
            </button>
            <button
              onClick={() => setType('goal')}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                type === 'goal' ? 'bg-accent text-white' : 'border border-border text-text-secondary'
              }`}
            >
              Goal
            </button>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={handleCreate}
              disabled={!name.trim() || submitting}
              className="flex-1 rounded-lg bg-accent py-2 text-sm font-semibold text-white transition-opacity disabled:opacity-40"
            >
              {submitting ? 'Creating...' : 'Create Plate'}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-border px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border py-3 text-sm font-medium text-text-secondary hover:border-accent hover:text-accent transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Plate
        </button>
      )}
    </div>
  );
}
