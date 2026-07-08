import { create } from "zustand";
import { getSettings, saveSettings } from "../ipc";
import { debounce } from "../lib/utils";

export type AppTheme = "system" | "light" | "dark";
export type ReaderTheme = "light" | "sepia" | "gray" | "dark" | "black";
export type ReaderFont = "serif" | "sans" | "mono" | "system";
export type Flow = "paginated" | "scrolled";
export type SortKey = "recentlyOpened" | "recentlyAdded" | "title" | "author" | "progress";
export type LibraryView = "grid" | "list";

export interface ReaderSettings {
  font: ReaderFont;
  fontSize: number;
  lineHeight: number;
  /** Page margin as % of the page width given to gaps. */
  margin: number;
  justify: boolean;
  hyphenate: boolean;
  theme: ReaderTheme;
  flow: Flow;
  /** Animate page turns (eased horizontal slide) in paginated mode. */
  pageAnimation: boolean;
}

export interface SettingsState {
  appTheme: AppTheme;
  accent: string;
  view: LibraryView;
  sort: SortKey;
  lastBookId: number | null;
  /** Measured reading speed, characters per minute. */
  charsPerMinute: number;
  reader: ReaderSettings;
  loaded: boolean;
  load: () => Promise<void>;
  set: (partial: Partial<Omit<SettingsState, "reader" | "load" | "set" | "setReader">>) => void;
  setReader: (partial: Partial<ReaderSettings>) => void;
}

export const DEFAULT_READER: ReaderSettings = {
  font: "serif",
  fontSize: 18,
  lineHeight: 1.6,
  margin: 6,
  justify: true,
  hyphenate: true,
  theme: "light",
  flow: "paginated",
  pageAnimation: true,
};

const DEFAULTS = {
  appTheme: "system" as AppTheme,
  accent: "#d97706",
  view: "grid" as LibraryView,
  sort: "recentlyOpened" as SortKey,
  lastBookId: null as number | null,
  charsPerMinute: 1600,
  reader: DEFAULT_READER,
};

const persist = debounce((state: SettingsState) => {
  void saveSettings({
    appTheme: state.appTheme,
    accent: state.accent,
    view: state.view,
    sort: state.sort,
    lastBookId: state.lastBookId,
    charsPerMinute: state.charsPerMinute,
    reader: state.reader,
  });
}, 400);

export const useSettings = create<SettingsState>((set, get) => ({
  ...DEFAULTS,
  loaded: false,
  load: async () => {
    try {
      const stored = await getSettings();
      set({
        ...DEFAULTS,
        ...stored,
        reader: { ...DEFAULT_READER, ...(stored.reader as Partial<ReaderSettings> | undefined) },
        loaded: true,
      });
    } catch {
      set({ loaded: true });
    }
  },
  set: (partial) => {
    set(partial);
    persist(get());
  },
  setReader: (partial) => {
    set({ reader: { ...get().reader, ...partial } });
    persist(get());
  },
}));

/** Keep the `dark` class and accent CSS variable in sync with settings. */
export function applyChrome(theme: AppTheme, accent: string) {
  const dark =
    theme === "dark" ||
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.style.setProperty("--accent", accent);
}
