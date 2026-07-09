import { useEffect, useRef, useState, type MutableRefObject } from "react";
import { useTranslation } from "react-i18next";
import type { FoliateView } from "foliate-js/view.js";
import { Icon } from "../../components/Icon";

interface Group {
  label: string;
  items: Array<{ cfi: string; pre: string; match: string; post: string }>;
}

/**
 * In-book full-text search using foliate's `view.search()` async generator.
 * Matches are auto-highlighted by the engine; we group results by chapter and
 * clear the highlights when the panel unmounts.
 */
export function SearchPanel({
  viewRef,
  onJump,
}: {
  viewRef: MutableRefObject<FoliateView | null>;
  onJump: (cfi: string) => void;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [groups, setGroups] = useState<Group[]>([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const view = viewRef.current;
    return () => view?.clearSearch();
  }, [viewRef]);

  // Debounced live search; a cancel flag drops superseded runs.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    let cancelled = false;
    const id = setTimeout(async () => {
      view.clearSearch();
      setGroups([]);
      const q = query.trim();
      if (!q) {
        setSearching(false);
        return;
      }
      setSearching(true);
      const acc: Group[] = [];
      for await (const r of view.search({ query: q })) {
        if (cancelled) return;
        if (r === "done") break;
        if (r.subitems?.length) {
          acc.push({
            label: r.label ?? "",
            items: r.subitems.map((s) => ({ cfi: s.cfi, ...s.excerpt })),
          });
          setGroups([...acc]);
        }
      }
      if (!cancelled) setSearching(false);
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [query, viewRef]);

  const total = groups.reduce((n, g) => n + g.items.length, 0);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border p-3">
        <div className="relative">
          <Icon
            name="search"
            size={15}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-text-muted"
          />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("reader.searchPlaceholder")}
            className="h-9 w-full rounded-lg border border-border bg-bg pr-3 pl-9 text-sm outline-none focus:border-accent"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {query.trim() && !searching && total === 0 && (
          <p className="mt-8 text-center text-sm text-text-muted">{t("reader.searchNoResults")}</p>
        )}
        {groups.map((g, gi) => (
          <div key={gi} className="mb-3">
            {g.label && (
              <div className="px-2 py-1 text-xs font-semibold tracking-wide text-text-muted uppercase">
                {g.label}
              </div>
            )}
            {g.items.map((it, ii) => (
              <button
                key={ii}
                onClick={() => onJump(it.cfi)}
                className="transition-fast block w-full rounded-md px-2 py-1.5 text-left text-sm leading-snug hover:bg-bg-sunken"
              >
                <span className="text-text-muted">{it.pre}</span>
                <mark className="rounded bg-accent/25 px-0.5 text-text">{it.match}</mark>
                <span className="text-text-muted">{it.post}</span>
              </button>
            ))}
          </div>
        ))}
        {searching && (
          <p className="p-2 text-center text-xs text-text-muted">{t("reader.searching")}</p>
        )}
      </div>
    </div>
  );
}
