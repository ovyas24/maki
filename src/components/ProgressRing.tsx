/** Small circular progress indicator used on Continue Reading covers. */
export function ProgressRing({ fraction, size = 28 }: { fraction: number; size?: number }) {
  const stroke = 3;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.round(fraction * 100);
  return (
    <svg width={size} height={size} role="img" aria-label={`${pct}%`}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="var(--bg-elevated)"
        stroke="var(--border)"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - Math.min(1, Math.max(0, fraction)))}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}
