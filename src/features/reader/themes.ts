import type { ReaderTheme, ReaderSettings } from "../../store/settings";

/** Reader page themes, independent of app chrome theme. */
export const READER_THEMES: Record<
  ReaderTheme,
  { bg: string; fg: string; link: string; isDark: boolean }
> = {
  light: { bg: "#ffffff", fg: "#1c1917", link: "#b45309", isDark: false },
  sepia: { bg: "#f7f1e3", fg: "#57482f", link: "#9a6b1f", isDark: false },
  gray: { bg: "#454545", fg: "#e0dedb", link: "#f0b35c", isDark: true },
  dark: { bg: "#171717", fg: "#d6d3d0", link: "#f0b35c", isDark: true },
  black: { bg: "#000000", fg: "#b8b4ae", link: "#d99b45", isDark: true },
};

export interface FontFace {
  family: string;
  url: string;
}

/**
 * CSS injected into every book section document. Forces theme colors for
 * non-light themes (books love hardcoding #000 text) and applies typography.
 */
export function readerCSS(
  settings: ReaderSettings,
  fonts: Partial<Record<"serif" | "sans" | "mono", FontFace>>,
): string {
  const theme = READER_THEMES[settings.theme];
  const faces = Object.values(fonts)
    .map(
      (f) => `@font-face {
        font-family: "${f.family}";
        src: url("${f.url}") format("woff2-variations");
        font-weight: 100 900;
      }`,
    )
    .join("\n");
  const family = {
    serif: fonts.serif?.family ?? "serif",
    sans: fonts.sans?.family ?? "sans-serif",
    mono: fonts.mono?.family ?? "monospace",
    system: "system-ui",
  }[settings.font];

  // ponytail: forcing color on all elements breaks books that use color
  // semantically, but it's what every dark-mode reader does; revisit with an
  // "override book colors" toggle if it bites.
  const forceColors = theme.isDark
    ? `*, *::before, *::after {
        color: ${theme.fg} !important;
        background-color: transparent !important;
        border-color: color-mix(in srgb, ${theme.fg} 30%, transparent) !important;
      }
      img, svg { background-color: transparent !important; }`
    : "";

  return `
    ${faces}
    html {
      color-scheme: ${theme.isDark ? "dark" : "light"};
      color: ${theme.fg};
      font-family: ${family};
      font-size: ${settings.fontSize}px;
    }
    ${forceColors}
    a:any-link { color: ${theme.link} !important; }
    p, li, blockquote, dd {
      line-height: ${settings.lineHeight};
      text-align: ${settings.justify ? "justify" : "start"};
      -webkit-hyphens: ${settings.hyphenate ? "auto" : "manual"};
      hyphens: ${settings.hyphenate ? "auto" : "manual"};
      -webkit-hyphenate-limit-before: 3;
      -webkit-hyphenate-limit-after: 2;
      -webkit-hyphenate-limit-lines: 2;
      widows: 2;
    }
    [align="left"] { text-align: left; }
    [align="right"] { text-align: right; }
    [align="center"] { text-align: center; }
    pre { white-space: pre-wrap !important; }
    ::selection { background: color-mix(in srgb, ${theme.link} 30%, transparent); }
  `;
}
