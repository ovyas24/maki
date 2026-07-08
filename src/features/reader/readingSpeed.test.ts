import { describe, expect, it } from "vitest";
import { FOLIATE_CPM, SpeedTracker, scaleTimeLeft } from "./readingSpeed";

describe("SpeedTracker", () => {
  it("returns the prior with no data", () => {
    expect(new SpeedTracker().cpm(1500)).toBe(1500);
  });

  it("measures a slower reader and scales estimates up", () => {
    const tracker = new SpeedTracker();
    // Read at exactly 800 cpm: every minute, remaining drops by 0.5 foliate-min.
    let now = 0;
    let remaining = 100;
    tracker.sample(now, remaining);
    for (let i = 0; i < 40; i++) {
      now += 60_000;
      remaining -= 0.5;
      tracker.sample(now, remaining);
    }
    const cpm = tracker.cpm(FOLIATE_CPM);
    expect(cpm).toBeLessThan(FOLIATE_CPM);
    expect(cpm).toBeGreaterThan(700);
    // 10 foliate-minutes left in the chapter takes longer at 800 cpm
    expect(scaleTimeLeft(10, 800)).toBeCloseTo(20, 5);
  });

  it("ignores idle gaps and backwards jumps", () => {
    const tracker = new SpeedTracker();
    tracker.sample(0, 100);
    tracker.sample(60 * 60_000, 90); // an hour gap — user walked away
    tracker.sample(61 * 60_000, 95); // jumped backwards
    expect(tracker.cpm(1600)).toBe(1600);
  });
});
