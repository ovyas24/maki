import { create } from "zustand";

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
  openBook: (bookId) => set({ screen: { name: "reader", bookId } }),
  goTo: (screen) => set({ screen }),
  setShortcutsOpen: (open) => set({ shortcutsOpen: open }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
}));
