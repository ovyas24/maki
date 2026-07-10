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
import { filterAndSort, continueReading, filterByStatus, type LibraryFilter } from "./sorting";
import { ContinueReading } from "./ContinueReading";
import { BookGrid } from "./BookGrid";
import { BookList } from "./BookList";

const BOOK_FILTERS = [
  { name: "Ebooks", extensions: ["epub", "mobi", "azw", "azw3", "fb2", "fbz", "cbz", "pdf"] },
];
const LIBRARY_FILTERS: LibraryFilter[] = ["all", "reading", "unread", "finished", "missing"];

export async function pickAndImport(importPaths: (paths: string[]) => Promise<unknown>) {
  const picked = await openFileDialog({ multiple: true, filters: BOOK_FILTERS });
  if (picked && picked.length) await importPaths(picked);
}

export function LibraryPage() {
  const { t } = useTranslation();
  const { books, query, setQuery, importPaths, remove } = useLibrary();
  const settings = useSettings();
  const [toRemove, setToRemove] = useState<Book | null>(null);
  const [filter, setFilter] = useState<LibraryFilter>("all");
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

  const matched = useMemo(() => {
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
  const visible = useMemo(() => filterByStatus(matched, filter), [matched, filter]);
  const hero = useMemo(() => continueReading(books), [books]);
  const filterCounts = useMemo(
    () =>
      Object.fromEntries(
        LIBRARY_FILTERS.map((key) => [key, filterByStatus(books, key).length]),
      ) as Record<LibraryFilter, number>,
    [books],
  );

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
    <div className="library-canvas flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-3 px-8 pt-6 pb-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{t("library.title")}</h1>
          <p className="mt-0.5 text-xs text-text-muted">
            {t("library.summary", {
              count: books.length,
              reading: filterCounts.reading,
            })}
          </p>
        </div>
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
            {!query && filter === "all" && <ContinueReading books={hero} />}
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">{t("library.allBooks")}</h2>
                <p className="mt-0.5 text-xs text-text-muted">
                  {t("library.showing", { count: visible.length })}
                </p>
              </div>
              <div
                className="flex max-w-full gap-1 overflow-x-auto rounded-xl border border-border bg-bg-elevated/80 p-1 shadow-card"
                aria-label={t("library.filters.label")}
              >
                {LIBRARY_FILTERS.map((key) => (
                  <button
                    key={key}
                    aria-pressed={filter === key}
                    onClick={() => setFilter(key)}
                    className={cn(
                      "transition-fast flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 text-xs font-medium",
                      filter === key
                        ? "bg-accent text-accent-contrast shadow-sm"
                        : "text-text-muted hover:bg-bg-sunken hover:text-text",
                    )}
                  >
                    {t(`library.filters.${key}`)}
                    <span className={cn("tabular-nums", filter === key && "opacity-75")}>
                      {filterCounts[key]}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            {visible.length === 0 ? (
              <div className="mt-12 flex flex-col items-center text-center">
                <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-bg-sunken text-text-muted">
                  <Icon name="search" size={20} />
                </span>
                <p className="font-medium">
                  {query
                    ? t("library.noResults", { query })
                    : t("library.filters.empty", { filter: t(`library.filters.${filter}`) })}
                </p>
                <p className="mt-1 max-w-sm text-sm text-text-muted">
                  {t("library.filters.emptyHint")}
                </p>
                <Button
                  variant="ghost"
                  className="mt-3"
                  onClick={() => {
                    setQuery("");
                    setFilter("all");
                  }}
                >
                  {t("library.filters.clear")}
                </Button>
              </div>
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
