'use client';

import { useRef, useCallback } from 'react';

interface SwipeConfig {
  onSwipeRight?: () => void;
  onSwipeLeft?: () => void;
  enabled?: boolean;
  threshold?: number;
}

interface SwipeState {
  ref: React.RefObject<HTMLDivElement | null>;
  bgRef: React.RefObject<HTMLDivElement | null>;
  handlers: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: () => void;
  };
}

export function useSwipeAction({
  onSwipeRight,
  onSwipeLeft,
  enabled = true,
  threshold = 100,
}: SwipeConfig): SwipeState {
  const ref = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const startY = useRef(0);
  const currentX = useRef(0);
  const isSwiping = useRef(false);
  const isScrollLocked = useRef(false);
  const startTime = useRef(0);
  const direction = useRef<'left' | 'right' | null>(null);

  const VELOCITY_THRESHOLD = 0.5;

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enabled) return;
    const touch = e.touches[0];
    startX.current = touch.clientX;
    startY.current = touch.clientY;
    currentX.current = 0;
    isSwiping.current = false;
    isScrollLocked.current = false;
    direction.current = null;
    startTime.current = Date.now();
    if (ref.current) ref.current.style.transition = 'none';
  }, [enabled]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!enabled) return;
    const touch = e.touches[0];
    const deltaX = touch.clientX - startX.current;
    const deltaY = touch.clientY - startY.current;

    if (!isScrollLocked.current && !isSwiping.current) {
      if (Math.abs(deltaX) > 10 && Math.abs(deltaX) > Math.abs(deltaY)) {
        isSwiping.current = true;
        isScrollLocked.current = true;
      } else if (Math.abs(deltaY) > 10) {
        return;
      }
    }

    if (!isSwiping.current) return;
    e.preventDefault();

    const absDelta = Math.abs(deltaX);
    direction.current = deltaX > 0 ? 'right' : 'left';
    currentX.current = deltaX;

    // Apply resistance after threshold
    const translated = absDelta > threshold
      ? threshold + (absDelta - threshold) * 0.4
      : absDelta;

    const sign = deltaX > 0 ? 1 : -1;

    if (ref.current) {
      ref.current.style.transform = `translateX(${sign * translated}px)`;
    }
    if (bgRef.current) {
      const progress = Math.min(absDelta / threshold, 1);
      bgRef.current.style.opacity = `${progress}`;
      bgRef.current.setAttribute('data-direction', direction.current);
    }
  }, [enabled, threshold]);

  const onTouchEnd = useCallback(() => {
    if (!enabled || !isSwiping.current) return;

    const absDelta = Math.abs(currentX.current);
    const elapsed = Date.now() - startTime.current;
    const velocity = absDelta / Math.max(elapsed, 1);
    const triggered = absDelta >= threshold || (velocity > VELOCITY_THRESHOLD && absDelta > 40);

    if (ref.current) ref.current.style.transition = 'transform 0.3s ease';

    if (triggered && direction.current === 'right' && onSwipeRight) {
      if (ref.current) ref.current.style.transform = 'translateX(120%)';
      try { navigator.vibrate?.(10); } catch { /* ignore */ }
      setTimeout(onSwipeRight, 200);
    } else if (triggered && direction.current === 'left' && onSwipeLeft) {
      if (ref.current) ref.current.style.transform = 'translateX(-120%)';
      try { navigator.vibrate?.(10); } catch { /* ignore */ }
      setTimeout(onSwipeLeft, 200);
    } else {
      if (ref.current) ref.current.style.transform = '';
      if (bgRef.current) bgRef.current.style.opacity = '0';
    }

    isSwiping.current = false;
    isScrollLocked.current = false;
  }, [enabled, threshold, onSwipeRight, onSwipeLeft]);

  return {
    ref,
    bgRef,
    handlers: { onTouchStart, onTouchMove, onTouchEnd },
  };
}
