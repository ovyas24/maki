import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { onLibraryUpdated } from "./ipc";
import { useApp } from "./store/app";
import { useLibrary } from "./store/library";
import { useSettings, applyChrome } from "./store/settings";
import { withViewTransition } from "./lib/utils";
import { Titlebar } from "./components/Titlebar";
import { Sidebar } from "./components/Sidebar";
import { Icon } from "./components/Icon";
import { SplashScreen } from "./components/SplashScreen";
import { ShortcutsOverlay } from "./components/ShortcutsOverlay";
import { ImportToast } from "./components/ImportToast";
import { LibraryPage, pickAndImport } from "./features/library/LibraryPage";
import { extractPendingMetadata } from "./features/library/extractMetadata";
import { ReaderPage } from "./features/reader/ReaderPage";
import { SettingsPage } from "./features/settings/SettingsPage";

export default function App() {
  const { t } = useTranslation();
  const { screen, setShortcutsOpen, shortcutsOpen } = useApp();
  const library = useLibrary();
  const settings = useSettings();
  const [dropActive, setDropActive] = useState(false);

  // Boot: settings, library, watch-folder events.
  useEffect(() => {
    void useSettings
      .getState()
      .load()
      .then(() => useLibrary.getState().load());
    const unlisten = onLibraryUpdated((books) => useLibrary.getState().upsert(books));
    return () => {
      void unlisten.then((fn) => fn());
    };
  }, []);

  // Keep app chrome theme in sync (including OS theme changes), crossfading
  // the switch where the engine supports View Transitions.
  useEffect(() => {
    withViewTransition(() => applyChrome(settings.appTheme, settings.accent));
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () =>
      withViewTransition(() => applyChrome(settings.appTheme, settings.accent));
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [settings.appTheme, settings.accent]);

  // Background metadata/cover extraction for pending books.
  useEffect(() => {
    if (!library.loaded) return;
    const pending = library.books.filter((b) => !b.metadataExtracted && !b.missing);
    if (!pending.length) return;
    void extractPendingMetadata(pending, (id, fields) => useLibrary.getState().patch(id, fields));
  }, [library.loaded, library.books]);

  // Native drag-and-drop import.
  useEffect(() => {
    const unlisten = getCurrentWebview().onDragDropEvent((event) => {
      if (event.payload.type === "over") setDropActive(true);
      else if (event.payload.type === "drop") {
        setDropActive(false);
        void useLibrary.getState().importPaths(event.payload.paths);
      } else setDropActive(false);
    });
    return () => {
      void unlisten.then((fn) => fn());
    };
  }, []);

  // Global shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "?") {
        setShortcutsOpen(!shortcutsOpen);
      } else if (e.key === "o" && e.ctrlKey) {
        e.preventDefault();
        void pickAndImport((paths) => useLibrary.getState().importPaths(paths));
      } else if (e.key === "\\" && e.ctrlKey) {
        const s = useSettings.getState();
        s.set({ view: s.view === "grid" ? "list" : "grid" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shortcutsOpen, setShortcutsOpen]);

  const currentBook =
    screen.name === "reader" ? library.books.find((b) => b.id === screen.bookId) : undefined;
  const reading = currentBook !== undefined;

  const booted = settings.loaded && library.loaded;

  return (
    <div className="flex h-full flex-col">
      <SplashScreen done={booted} />
      {!reading && (
        <Titlebar>
          <span className="ml-2 text-sm font-semibold tracking-tight" data-tauri-drag-region>
            {t("app.name")}
          </span>
        </Titlebar>
      )}
      <div className="flex min-h-0 flex-1">
        {!reading && <Sidebar />}
        <main className="min-w-0 flex-1">
          {screen.name === "library" && <LibraryPage />}
          {screen.name === "settings" && <SettingsPage />}
          {screen.name === "reader" &&
            (reading ? <ReaderPage key={currentBook.id} book={currentBook} /> : <LibraryPage />)}
        </main>
      </div>

      {dropActive && (
        <div className="fade-in pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-accent/10 backdrop-blur-xs">
          <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-accent bg-bg-elevated px-10 py-8 shadow-lift">
            <Icon name="download" size={32} className="text-accent" />
            <span className="font-medium">{t("library.import")}</span>
          </div>
        </div>
      )}
      <ShortcutsOverlay />
      <ImportToast />
    </div>
  );
}
