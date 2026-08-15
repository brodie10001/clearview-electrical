"use client";

import { useEffect, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { clsx } from "clsx";

const REVEAL_WIDTH = 88;
// Minimum movement before we commit to a direction at all -- below this,
// a touch could still be a tap or the start of either gesture.
const DIRECTION_LOCK_PX = 10;
// How far past that lock point counts as "open" on release.
const OPEN_THRESHOLD_PX = 40;

interface SwipeableRowProps {
  children: React.ReactNode;
  onDelete: () => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  disabled?: boolean;
  // Applied to the outer (overflow-hidden) container -- lets a caller round
  // or add a border/shadow to the whole swipeable unit (delete button
  // included) without that styling living inside this shared component.
  className?: string;
}

// Swipe-left-to-reveal-delete, built directly on native touch listeners
// (not React's onTouchMove) because only a non-passive listener can
// conditionally call preventDefault -- required to stop the page scrolling
// once a swipe is confirmed horizontal, without ever blocking a genuine
// vertical scroll. The direction is decided once, after DIRECTION_LOCK_PX
// of movement, by comparing |deltaX| to |deltaY|: whichever is larger wins,
// and once vertical is chosen we do nothing at all for the rest of that
// touch -- native scrolling stays completely untouched. `touch-action:
// pan-y` on the wrapper backs this up at the browser/compositor level too,
// so vertical scroll never has to wait on JS to decide.
export function SwipeableRow({
  children,
  onDelete,
  isOpen,
  onOpenChange,
  disabled = false,
  className,
}: SwipeableRowProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [translateX, setTranslateX] = useState(isOpen ? -REVEAL_WIDTH : 0);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    startTranslate: number;
    direction: "horizontal" | "vertical" | null;
  } | null>(null);

  // Sync to external changes (e.g. the parent closing this row because
  // another one was swiped open) without an effect -- React's documented
  // pattern for adjusting state when a prop changes.
  const [syncedOpen, setSyncedOpen] = useState(isOpen);
  if (isOpen !== syncedOpen) {
    setSyncedOpen(isOpen);
    setTranslateX(isOpen ? -REVEAL_WIDTH : 0);
  }

  useEffect(() => {
    const el = containerRef.current;
    if (!el || disabled) return;

    function onTouchStart(e: TouchEvent) {
      const touch = e.touches[0];
      dragRef.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        startTranslate: isOpen ? -REVEAL_WIDTH : 0,
        direction: null,
      };
    }

    function onTouchMove(e: TouchEvent) {
      const drag = dragRef.current;
      if (!drag) return;
      const touch = e.touches[0];
      const deltaX = touch.clientX - drag.startX;
      const deltaY = touch.clientY - drag.startY;

      if (drag.direction === null) {
        if (Math.abs(deltaX) < DIRECTION_LOCK_PX && Math.abs(deltaY) < DIRECTION_LOCK_PX) {
          return;
        }
        drag.direction = Math.abs(deltaX) > Math.abs(deltaY) ? "horizontal" : "vertical";
        if (drag.direction === "horizontal") setDragging(true);
      }

      if (drag.direction !== "horizontal") return;

      // Only reached once we're sure this is a horizontal swipe -- safe to
      // stop the page from scrolling for the rest of this gesture.
      e.preventDefault();
      const next = Math.min(0, Math.max(-REVEAL_WIDTH, drag.startTranslate + deltaX));
      setTranslateX(next);
    }

    function onTouchEnd() {
      const drag = dragRef.current;
      dragRef.current = null;
      setDragging(false);
      if (!drag || drag.direction !== "horizontal") return;

      setTranslateX((current) => {
        const shouldOpen = current <= -OPEN_THRESHOLD_PX;
        onOpenChange(shouldOpen);
        return shouldOpen ? -REVEAL_WIDTH : 0;
      });
    }

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    el.addEventListener("touchcancel", onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [isOpen, disabled, onOpenChange]);

  return (
    <div ref={containerRef} className={clsx("relative touch-pan-y overflow-hidden", className)}>
      <button
        type="button"
        onClick={onDelete}
        aria-label="Delete"
        style={{ width: REVEAL_WIDTH }}
        className="absolute inset-y-0 right-0 flex items-center justify-center gap-1.5 bg-red-600 text-sm font-medium text-white"
      >
        <Trash2 className="h-4 w-4" />
      </button>
      <div
        style={{
          transform: `translateX(${translateX}px)`,
          transition: dragging ? "none" : "transform 180ms ease-out",
        }}
        // Swallow the click that would otherwise navigate/activate the row
        // underneath while it's swiped open -- the first tap just closes it,
        // matching the standard "tap elsewhere closes the reveal" pattern.
        onClickCapture={(e) => {
          if (translateX !== 0) {
            e.preventDefault();
            e.stopPropagation();
            onOpenChange(false);
          }
        }}
        className="relative bg-white dark:bg-neutral-900"
      >
        {children}
      </div>
    </div>
  );
}
