/**
 * Measures actual reading speed to calibrate foliate-js's time estimates,
 * which assume a fixed 1600 characters/minute.
 */
export const FOLIATE_CPM = 1600;

export class SpeedTracker {
  private lastSampleMs: number | null = null;
  private lastRemainingMin: number | null = null;
  private chars = 0;
  private minutes = 0;

  /**
   * Feed each relocation: `remainingMin` is foliate's `time.total` (minutes
   * left in the book at 1600 cpm). Characters advanced between samples is the
   * drop in remaining time × 1600.
   */
  sample(nowMs: number, remainingMin: number): void {
    if (this.lastSampleMs !== null && this.lastRemainingMin !== null) {
      const advancedChars = (this.lastRemainingMin - remainingMin) * FOLIATE_CPM;
      const elapsedMin = (nowMs - this.lastSampleMs) / 60_000;
      // Ignore backwards jumps, big skips, and long idle gaps.
      if (advancedChars > 0 && advancedChars < 20_000 && elapsedMin > 0 && elapsedMin < 5) {
        this.chars += advancedChars;
        this.minutes += elapsedMin;
      }
    }
    this.lastSampleMs = nowMs;
    this.lastRemainingMin = remainingMin;
  }

  /** Measured cpm, blended toward `prior` until enough data accumulates. */
  cpm(prior: number = FOLIATE_CPM): number {
    if (this.minutes < 1) return prior;
    const measured = this.chars / this.minutes;
    // weight measurement by minutes read this session, capped at 30 min
    const w = Math.min(this.minutes, 30) / 30;
    return Math.round(prior * (1 - w) + measured * w);
  }
}

/** Scale a foliate minutes-remaining estimate by the measured speed. */
export function scaleTimeLeft(foliateMinutes: number, cpm: number): number {
  return (foliateMinutes * FOLIATE_CPM) / Math.max(cpm, 100);
}
