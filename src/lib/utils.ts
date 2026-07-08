export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Run a DOM-mutating callback inside a View Transition (crossfade) when the
 * engine supports it and motion is allowed; otherwise apply it instantly.
 * Feature-detected, so it's a no-op fallback on older WebKitGTK.
 */
export function withViewTransition(mutate: () => void): void {
  const doc = document as Document & {
    startViewTransition?: (cb: () => void) => { finished: Promise<void> };
  };
  if (doc.startViewTransition && !prefersReducedMotion()) {
    doc.startViewTransition(mutate);
  } else {
    mutate();
  }
}

/** Cover cache paths come from Rust as absolute paths; serve via asset protocol. */
import { convertFileSrc } from "@tauri-apps/api/core";
export function coverUrl(coverPath: string | null): string | null {
  return coverPath ? convertFileSrc(coverPath) : null;
}

export function formatRelativeTime(unixSeconds: number, now = Date.now()): string {
  const diff = Math.max(0, Math.floor(now / 1000) - unixSeconds);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  if (diff < 60) return rtf.format(0, "minute");
  if (diff < 3600) return rtf.format(-Math.floor(diff / 60), "minute");
  if (diff < 86400) return rtf.format(-Math.floor(diff / 3600), "hour");
  if (diff < 86400 * 30) return rtf.format(-Math.floor(diff / 86400), "day");
  if (diff < 86400 * 365) return rtf.format(-Math.floor(diff / (86400 * 30)), "month");
  return rtf.format(-Math.floor(diff / (86400 * 365)), "year");
}

export function debounce<A extends unknown[]>(
  fn: (...args: A) => void,
  ms: number,
): ((...args: A) => void) & { flush: () => void } {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pending: A | undefined;
  const run = () => {
    timer = undefined;
    if (pending) {
      const args = pending;
      pending = undefined;
      fn(...args);
    }
  };
  const debounced = (...args: A) => {
    pending = args;
    if (timer) clearTimeout(timer);
    timer = setTimeout(run, ms);
  };
  debounced.flush = () => {
    if (timer) clearTimeout(timer);
    run();
  };
  return debounced;
}
