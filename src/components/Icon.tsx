// Hand-inlined 24px stroke icons (Lucide-style geometry), no icon dependency.
const PATHS: Record<string, string> = {
  library: "M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20",
  settings:
    "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7.5 7.5 0 0 0-2-1.2L14.5 3h-5l-.4 2.6a7.5 7.5 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7.5 7.5 0 0 0 2 1.2l.4 2.6h5l.4-2.6a7.5 7.5 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.06-.4.1-.8.1-1.2Z",
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm10 2-4.35-4.35",
  grid: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
  list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  plus: "M12 5v14M5 12h14",
  x: "M18 6 6 18M6 6l12 12",
  minus: "M5 12h14",
  square: "M5 5h14v14H5z",
  chevronLeft: "m15 18-6-6 6-6",
  chevronRight: "m9 18 6-6-6-6",
  chevronDown: "m6 9 6 6 6-6",
  toc: "M4 6h.01M4 12h.01M4 18h.01M9 6h11M9 12h11M9 18h7",
  highlighter: "m9 11-6 6v3h3l6-6m-3-3 6-6 3 3-6 6m-3-3 3 3",
  type: "M4 7V5h16v2M9 20h6M12 5v15",
  fullscreen:
    "M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3",
  trash:
    "M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M10 11v6M14 11v6",
  note: "M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z",
  copy: "M8 8h12v12H8zM4 16V4h12",
  check: "M20 6 9 17l-5-5",
  folder: "M4 4h5l2 3h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z",
  warning:
    "M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z",
  book: "M2 4c3-1.5 5.5-1.5 8 0v16c-2.5-1.5-5-1.5-8 0zM22 4c-3-1.5-5.5-1.5-8 0v16c2.5-1.5 5-1.5 8 0z",
  underline: "M6 4v6a6 6 0 0 0 12 0V4M4 20h16",
  download: "M12 3v12m0 0 4-4m-4 4-4-4M4 21h16",
  sidebar: "M3 5h18v14H3zM9 5v14",
  keyboard: "M2 6h20v12H2zM6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10",
  sun: "M12 3v2M12 19v2M5 5l1.5 1.5M17.5 17.5L19 19M3 12h2M19 12h2M5 19l1.5-1.5M17.5 6.5L19 5M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z",
  bookmark: "M6 4h12a1 1 0 0 1 1 1v16l-7-4-7 4V5a1 1 0 0 1 1-1Z",
  bookmarkFilled: "M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1Z",
  play: "M7 5l12 7-12 7V5Z",
  pause: "M8 5v14M16 5v14",
  chevronDoubleLeft: "m11 18-6-6 6-6M18 18l-6-6 6-6",
  chevronDoubleRight: "m13 18 6-6-6-6M6 18l6-6-6-6",
  palette:
    "M12 3a9 9 0 1 0 0 18h1.5a1.5 1.5 0 0 0 0-3H12a2 2 0 0 1 0-4h2a7 7 0 0 0-2-11ZM7.5 10h.01M9.5 6.5h.01M14.5 6.5h.01M17 10h.01",
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Zm-3-10 2 2 4-4",
};

export function Icon({
  name,
  size = 16,
  className,
}: {
  name: keyof typeof PATHS | string;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d={PATHS[name] ?? ""} />
    </svg>
  );
}
