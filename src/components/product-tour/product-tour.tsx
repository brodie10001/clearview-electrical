"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { markTourCompleted } from "@/app/(app)/tour-actions";

interface TourStep {
  target: string; // matches a data-tour="..." attribute
  title: string;
  body: string;
}

const STEPS: TourStep[] = [
  {
    target: "dashboard-home",
    title: "Your home base",
    body: "Today's jobs and anything needing attention, at a glance.",
  },
  {
    target: "quick-action-button",
    title: "Get things done fast",
    body: "Tap here anytime to start a new job, quote, or log an expense.",
  },
  {
    target: "nav-jobs",
    title: "Jobs",
    body: "Every job you're running, from first quote to final invoice.",
  },
  {
    target: "profile-menu",
    title: "Business Settings",
    body: "Tap here, then Settings, to set your labour rates, materials catalogue, suppliers, and more.",
  },
  {
    target: "help-button",
    title: "Stuck, or found a bug?",
    body: "Tap here — it comes straight to me.",
  },
];

const MAX_WAIT_MS = 4000;

// Finds the first matching element that's actually visible -- some targets
// (e.g. the Jobs nav link) exist twice in the DOM at once, once in the
// desktop sidebar and once in the mobile bottom nav, with responsive
// Tailwind classes hiding whichever one doesn't apply. offsetParent is null
// for anything with display:none (or an ancestor with it), which is
// exactly the cheap check needed here.
function findVisibleTarget(selector: string): HTMLElement | null {
  const candidates = document.querySelectorAll<HTMLElement>(`[data-tour="${selector}"]`);
  for (const el of candidates) {
    if (el.offsetParent !== null) return el;
  }
  return null;
}

// Some targets live inside Suspense boundaries that resolve slightly after
// this component mounts (e.g. the sidebar's nav items depend on an async
// profile fetch) -- poll briefly via MutationObserver instead of assuming
// the element is already in the DOM on the first render.
function waitForVisibleTarget(selector: string): Promise<HTMLElement | null> {
  const immediate = findVisibleTarget(selector);
  if (immediate) return Promise.resolve(immediate);

  return new Promise((resolve) => {
    const observer = new MutationObserver(() => {
      const el = findVisibleTarget(selector);
      if (el) {
        observer.disconnect();
        clearTimeout(timeout);
        resolve(el);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
    const timeout = setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, MAX_WAIT_MS);
  });
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const SPOTLIGHT_PADDING = 8;

export function ProductTour({ shouldShow }: { shouldShow: boolean }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [ready, setReady] = useState(false);
  const [ended, setEnded] = useState(false);
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (!shouldShow || ended) return;
    cancelledRef.current = false;

    const step = STEPS[stepIndex];
    waitForVisibleTarget(step.target).then((el) => {
      if (cancelledRef.current) return;
      if (!el) {
        // Target never showed up (e.g. a technician without a sidebar item
        // that only admins see) -- skip straight past this step rather
        // than getting stuck.
        goNext();
        return;
      }
      el.scrollIntoView({ block: "center", behavior: "instant" as ScrollBehavior });
      const measure = () => {
        const r = el.getBoundingClientRect();
        setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
        setReady(true);
      };
      // One frame after scrollIntoView so the measured position reflects
      // where the element actually settled, not mid-scroll.
      requestAnimationFrame(measure);
    });

    function onReposition() {
      const el = findVisibleTarget(step.target);
      if (!el) return;
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    }
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);

    return () => {
      cancelledRef.current = true;
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- goNext is stable enough for this; re-running on it would re-trigger the search
  }, [shouldShow, stepIndex, ended]);

  function finish() {
    setEnded(true);
    markTourCompleted();
  }

  function goNext() {
    if (stepIndex >= STEPS.length - 1) {
      finish();
      return;
    }
    setReady(false);
    setStepIndex((i) => i + 1);
  }

  if (!shouldShow || ended || !ready || !rect) return null;

  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;

  const spot = {
    top: rect.top - SPOTLIGHT_PADDING,
    left: rect.left - SPOTLIGHT_PADDING,
    width: rect.width + SPOTLIGHT_PADDING * 2,
    height: rect.height + SPOTLIGHT_PADDING * 2,
  };

  // Callout goes below the spotlight, unless there isn't room -- then it
  // goes above. Horizontally centered on the target but clamped inside the
  // viewport so it never runs off-screen on narrow mobile widths.
  const CALLOUT_WIDTH = 280;
  const CALLOUT_GAP = 12;
  const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 375;
  const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 667;

  const spaceBelow = viewportHeight - (spot.top + spot.height);
  const placeAbove = spaceBelow < 160 && spot.top > 160;

  const calloutTop = placeAbove
    ? spot.top - CALLOUT_GAP
    : spot.top + spot.height + CALLOUT_GAP;

  const idealLeft = spot.left + spot.width / 2 - CALLOUT_WIDTH / 2;
  const calloutLeft = Math.min(
    Math.max(idealLeft, 12),
    viewportWidth - CALLOUT_WIDTH - 12,
  );

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Product tour">
      {/* Dark overlay with a see-through "hole" cut exactly around the
          spotlighted element, via a huge box-shadow rather than a
          computed 4-rectangle backdrop or an SVG/canvas mask -- the
          lightest way to get this effect with no dependency. */}
      <div
        aria-hidden
        className="pointer-events-none absolute rounded-xl transition-all duration-200"
        style={{
          top: spot.top,
          left: spot.left,
          width: spot.width,
          height: spot.height,
          boxShadow: "0 0 0 9999px rgba(0,0,0,0.6)",
        }}
      />
      {/* Full-screen catcher so nothing behind the tour is clickable while
          it's active -- keeps this simple (no per-step interaction with
          the real UI) rather than trying to punch real click-through into
          the spotlight hole. */}
      <button
        type="button"
        aria-hidden
        tabIndex={-1}
        className="absolute inset-0 cursor-default"
        onClick={finish}
      />

      <div
        className="absolute w-[280px] rounded-2xl bg-white p-4 shadow-xl ring-1 ring-black/5 dark:bg-neutral-900 dark:ring-white/10"
        style={{ top: calloutTop, left: calloutLeft, transform: placeAbove ? "translateY(-100%)" : undefined }}
      >
        <div className="mb-2 flex items-start justify-between gap-2">
          <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">{step.title}</p>
          <button
            type="button"
            onClick={finish}
            aria-label="Close tour"
            className="-mr-1 -mt-1 shrink-0 rounded-md p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">{step.body}</p>

        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-1">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 w-1.5 rounded-full ${
                  i === stepIndex ? "bg-amber-500" : "bg-neutral-200 dark:bg-neutral-700"
                }`}
              />
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={finish}
              className="text-sm font-medium text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
            >
              Skip
            </button>
            <button
              type="button"
              onClick={goNext}
              className="rounded-full bg-amber-500 px-3.5 py-1.5 text-sm font-semibold text-white hover:bg-amber-600"
            >
              {isLast ? "Got it" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
