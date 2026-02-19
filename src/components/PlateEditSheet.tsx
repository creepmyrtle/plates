'use client';

import { useState } from 'react';
import { useToast } from '@/components/Toast';
import type { Plate, PlateType } from '@/lib/types';

const PLATE_COLORS = [
  '#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444',
  '#06B6D4', '#EC4899', '#6366F1', '#14B8A6',
];

interface PlateEditSheetProps {
  plate: Plate;
  onClose: () => void;
  onUpdated: (plate: Plate) => void;
  onArchived: () => void;
}

export default function PlateEditSheet({ plate, onClose, onUpdated, onArchived }: PlateEditSheetProps) {
  const { showToast } = useToast();
  const [name, setName] = useState(plate.name);
  const [description, setDescription] = useState(plate.description || '');
  const [color, setColor] = useState(plate.color);
  const [type, setType] = useState<PlateType>(plate.type);
  const [saving, setSaving] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);

    try {
      const res = await fetch(`/api/plates/${plate.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          color,
          type,
        }),
      });

      if (res.ok) {
        const { data } = await res.json();
        showToast('Plate updated', 'success');
        onUpdated(data);
      } else {
        showToast('Failed to update plate', 'error');
      }
    } catch {
      showToast('Failed to update plate', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async () => {
    if (!confirmArchive) {
      setConfirmArchive(true);
      return;
    }

    try {
      const res = await fetch(`/api/plates/${plate.id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Plate archived', 'success');
        onArchived();
      } else {
        showToast('Failed to archive plate', 'error');
      }
    } catch {
      showToast('Failed to archive plate', 'error');
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-t-2xl border-t border-border bg-bg-secondary p-6 animate-fade-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Edit Plate</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-text-secondary hover:text-text-primary hover:bg-bg-card transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Name */}
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Plate name"
          className="w-full rounded-lg border border-border bg-bg-card px-4 py-3 text-text-primary placeholder:text-text-secondary focus:border-accent focus:outline-none"
        />

        {/* Description */}
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)"
          className="mt-3 w-full rounded-lg border border-border bg-bg-card px-4 py-3 text-sm text-text-primary placeholder:text-text-secondary focus:border-accent focus:outline-none"
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

        {/* Action buttons */}
        <div className="mt-5 flex gap-2">
          <button
            onClick={handleSave}
            disabled={!name.trim() || saving}
            className="flex-1 rounded-lg bg-accent py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-40"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            onClick={handleArchive}
            className={`rounded-lg border px-4 py-3 text-sm font-semibold transition-colors ${
              confirmArchive
                ? 'border-danger bg-danger text-white'
                : 'border-danger/30 text-danger hover:bg-danger/10'
            }`}
          >
            {confirmArchive ? 'Confirm' : 'Archive'}
          </button>
        </div>
      </div>
    </div>
  );
}
