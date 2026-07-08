import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { open as openFileDialog } from "@tauri-apps/plugin-dialog";
import type { Book } from "../../ipc";
import { searchLibrary } from "../../ipc";
import { useLibrary } from "../../store/library";
import { useSettings, type SortKey } from "../../store/settings";
import { Icon } from "../../components/Icon";
import { Button, Dialog, DialogActions, DialogTitle } from "../../components/Dialog";
import { cn, debounce } from "../../lib/utils";
import { filterAndSort, continueReading } from "./sorting";
import { ContinueReading } from "./ContinueReading";
import { BookGrid } from "./BookGrid";
import { BookList } from "./BookList";

const BOOK_FILTERS = [
  { name: "Ebooks", extensions: ["epub", "mobi", "azw", "azw3", "fb2", "fbz", "cbz", "pdf"] },
];

export async function pickAndImport(importPaths: (paths: string[]) => Promise<unknown>) {
  const picked = await openFileDialog({ multiple: true, filters: BOOK_FILTERS });
  if (picked && picked.length) await importPaths(picked);
}

export function LibraryPage() {
  const { t } = useTranslation();
  const { books, query, setQuery, importPaths, remove } = useLibrary();
  const settings = useSettings();
  const [toRemove, setToRemove] = useState<Book | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // FTS5 results (metadata + annotations), tagged with the query they answer.
  const [fts, setFts] = useState<{ q: string; ids: number[] } | null>(null);
  const runSearch = useMemo(
    () => debounce((q: string) => void searchLibrary(q).then((ids) => setFts({ q, ids })), 120),
    [],
  );
  useEffect(() => {
    // Stale results are ignored by the `fts.q === q` guard below, so there's
    // nothing to reset when the query clears. Re-run when books change too, so
    // metadata extraction refreshes the index-backed results.
    const q = query.trim();
    if (q) runSearch(q);
  }, [query, books, runSearch]);

  const visible = useMemo(() => {
    const q = query.trim();
    if (!q) return filterAndSort(books, "", settings.sort);
    // Authoritative FTS ordering once it answers this exact query…
    if (fts && fts.q === q) {
      const byId = new Map(books.map((b) => [b.id, b]));
      return fts.ids.map((id) => byId.get(id)).filter((b): b is Book => b !== undefined);
    }
    // …instant client fuzzy as a placeholder until it does.
    return filterAndSort(books, q, settings.sort);
  }, [books, query, fts, settings.sort]);
  const hero = useMemo(() => continueReading(books), [books]);

  // "/" focuses search (unless typing elsewhere)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const sortKeys: SortKey[] = ["recentlyOpened", "recentlyAdded", "title", "author", "progress"];

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-3 px-8 pt-6 pb-4">
        <h1 className="text-xl font-semibold tracking-tight">{t("library.title")}</h1>
        <div className="relative ml-6 max-w-xs flex-1">
          <Icon
            name="search"
            size={15}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-text-muted"
          />
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setQuery("");
                e.currentTarget.blur();
              }
            }}
            placeholder={t("library.searchPlaceholder")}
            className="transition-fast h-9 w-full rounded-lg border border-border bg-bg-elevated pr-3 pl-9 text-sm outline-none placeholder:text-text-muted focus:border-accent"
          />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <select
            aria-label={t("library.sort.label")}
            value={settings.sort}
            onChange={(e) => settings.set({ sort: e.target.value as SortKey })}
            className="h-9 rounded-lg border border-border bg-bg-elevated px-2.5 text-sm outline-none"
          >
            {sortKeys.map((key) => (
              <option key={key} value={key}>
                {t(`library.sort.${key}`)}
              </option>
            ))}
          </select>
          <div className="flex overflow-hidden rounded-lg border border-border">
            {(["grid", "list"] as const).map((view) => (
              <button
                key={view}
                aria-label={t(`library.view.${view}`)}
                onClick={() => settings.set({ view })}
                className={cn(
                  "transition-fast flex h-9 w-9 items-center justify-center",
                  settings.view === view
                    ? "bg-accent/12 text-accent"
                    : "bg-bg-elevated text-text-muted hover:text-text",
                )}
              >
                <Icon name={view} size={15} />
              </button>
            ))}
          </div>
          <Button variant="primary" onClick={() => void pickAndImport(importPaths)}>
            <Icon name="plus" size={15} />
            {t("library.import")}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 pb-8">
        {books.length === 0 ? (
          <EmptyLibrary onImport={() => void pickAndImport(importPaths)} />
        ) : (
          <>
            {!query && <ContinueReading books={hero} />}
            {visible.length === 0 ? (
              <p className="mt-16 text-center text-text-muted">
                {t("library.noResults", { query })}
              </p>
            ) : settings.view === "grid" ? (
              <BookGrid books={visible} onRemove={setToRemove} />
            ) : (
              <BookList
                books={visible}
                sort={settings.sort}
                onSort={(sort) => settings.set({ sort })}
                onRemove={setToRemove}
              />
            )}
          </>
        )}
      </div>

      <Dialog open={toRemove !== null} onClose={() => setToRemove(null)}>
        {toRemove && (
          <>
            <DialogTitle>{t("library.remove.title", { title: toRemove.title })}</DialogTitle>
            <p className="text-sm text-text-muted">{t("library.remove.body")}</p>
            <DialogActions>
              <Button onClick={() => setToRemove(null)}>{t("library.remove.cancel")}</Button>
              <Button
                variant="danger"
                onClick={() => {
                  void remove(toRemove.id, true);
                  setToRemove(null);
                }}
              >
                {t("library.remove.deleteFile")}
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  void remove(toRemove.id, false);
                  setToRemove(null);
                }}
              >
                {t("library.remove.keepFile")}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </div>
  );
}

function EmptyLibrary({ onImport }: { onImport: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
      <div className="flex h-24 w-24 items-center justify-center rounded-3xl border-2 border-dashed border-border text-text-muted">
        <Icon name="book" size={40} />
      </div>
      <div>
        <h2 className="text-lg font-semibold">{t("library.empty.title")}</h2>
        <p className="mx-auto mt-1 max-w-sm text-sm text-text-muted">{t("library.empty.body")}</p>
      </div>
      <Button variant="primary" onClick={onImport}>
        <Icon name="plus" size={15} />
        {t("library.empty.action")}
      </Button>
    </div>
  );
}
