/**
 * Tiny subsequence fuzzy matcher for instant library filtering.
 * Scores higher for consecutive matches and matches at word starts.
 * Returns null when the query is not a subsequence of the target.
 */
export function fuzzyScore(query: string, target: string): number | null {
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  if (!q) return 0;
  let score = 0;
  let ti = 0;
  let lastMatch = -2;
  for (let qi = 0; qi < q.length; qi++) {
    const c = q[qi];
    if (c === " ") continue; // spaces separate terms, don't require them
    const found = t.indexOf(c, ti);
    if (found === -1) return null;
    score += 1;
    if (found === lastMatch + 1) score += 2; // consecutive
    if (found === 0 || t[found - 1] === " ") score += 3; // word start
    lastMatch = found;
    ti = found + 1;
  }
  // slight preference for shorter targets
  return score - t.length / 1000;
}
