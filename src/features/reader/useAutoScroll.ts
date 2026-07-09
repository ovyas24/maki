import { useEffect, type MutableRefObject } from "react";
import type { FoliateView } from "foliate-js/view.js";
import { prefersReducedMotion } from "../../lib/utils";

/**
 * Auto-scroll for continuous (scrolled) mode. Drives the paginator's
 * `renderer.next(distance)` in a self-scheduling loop: each call advances the
 * scroll by a small amount and settles (~100ms), which also carries across
 * section boundaries. Stops when the position stops advancing (book end),
 * when deactivated, or under reduced-motion. `scrollBy` isn't used because it
 * clamps to a one-viewport window and stalls on long content.
 */
export function useAutoScroll(
  viewRef: MutableRefObject<FoliateView | null>,
  active: boolean,
  speed: number,
) {
  useEffect(() => {
    if (!active || prefersReducedMotion()) return;
    let stopped = false;
    const step = Math.max(1, Math.round(speed / 10)); // px per ~100ms tick
    const loop = async () => {
      while (!stopped) {
        const renderer = viewRef.current?.renderer;
        if (!renderer || renderer.atEnd) break;
        const before = renderer.start;
        await renderer.next(step);
        // No progress → reached the end of the book.
        if (viewRef.current?.renderer?.start === before) break;
      }
    };
    void loop();
    return () => {
      stopped = true;
    };
  }, [viewRef, active, speed]);
}
