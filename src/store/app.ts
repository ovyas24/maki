import { create } from "zustand";
import { withViewTransition } from "../lib/utils";

export type Screen =
  { name: "library" } | { name: "settings" } | { name: "reader"; bookId: number };

interface AppState {
  screen: Screen;
  shortcutsOpen: boolean;
  sidebarCollapsed: boolean;
  openBook: (bookId: number) => void;
  goTo: (screen: Screen) => void;
  setShortcutsOpen: (open: boolean) => void;
  toggleSidebar: () => void;
}

export const useApp = create<AppState>((set) => ({
  screen: { name: "library" },
  shortcutsOpen: false,
  sidebarCollapsed: false,
  // Wrap screen changes in a View Transition so library↔reader↔settings
  // crossfade where the engine supports it (instant fallback otherwise).
  openBook: (bookId) => withViewTransition(() => set({ screen: { name: "reader", bookId } })),
  goTo: (screen) => withViewTransition(() => set({ screen })),
  setShortcutsOpen: (open) => set({ shortcutsOpen: open }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
}));
