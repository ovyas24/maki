import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useApp } from "../store/app";
import { useLibrary } from "../store/library";
import { Cover } from "./Cover";
import { Icon } from "./Icon";
import { cn } from "../lib/utils";

export function Sidebar() {
  const { t } = useTranslation();
  const { screen, goTo, openBook, sidebarCollapsed, toggleSidebar, setShortcutsOpen } = useApp();
  const books = useLibrary((state) => state.books);
  const current = useMemo(
    () =>
      books
        .filter((book) => book.lastOpenedAt && !book.finished && !book.missing)
        .sort((a, b) => (b.lastOpenedAt ?? 0) - (a.lastOpenedAt ?? 0))[0],
    [books],
  );

  const navButton = (key: "library" | "settings", icon: string, label: string, badge?: number) => {
    const active = screen.name === key;
    return (
      <button
        onClick={() => goTo({ name: key })}
        title={sidebarCollapsed ? label : undefined}
        aria-current={active ? "page" : undefined}
        className={cn(
          "transition-fast relative flex h-10 w-full items-center gap-3 rounded-xl px-3 text-sm",
          active
            ? "bg-accent/12 font-semibold text-accent"
            : "text-text-muted hover:bg-bg-sunken hover:text-text",
        )}
      >
        {active && <span className="absolute top-2 bottom-2 left-0 w-0.5 rounded-full bg-accent" />}
        <Icon name={icon} size={18} className="shrink-0" />
        {!sidebarCollapsed && (
          <>
            <span className="truncate">{label}</span>
            {badge !== undefined && (
              <span className="ml-auto rounded-full bg-bg-sunken px-2 py-0.5 text-[11px] font-medium text-text-muted tabular-nums">
                {badge}
              </span>
            )}
          </>
        )}
      </button>
    );
  };

  return (
    <aside
      className={cn(
        "flex shrink-0 flex-col border-r border-border bg-bg/95 p-2.5",
        "transition-[width] duration-200 ease-out",
        sidebarCollapsed ? "w-14" : "w-60",
      )}
    >
      <nav aria-label={t("nav.primary")} className="flex flex-col gap-1">
        {!sidebarCollapsed && (
          <p className="px-3 pt-1 pb-1.5 text-[11px] font-semibold tracking-wider text-text-muted uppercase">
            {t("nav.browse")}
          </p>
        )}
        {navButton("library", "library", t("nav.library"), books.length)}
      </nav>

      {!sidebarCollapsed && current && (
        <section className="mt-5 px-1">
          <p className="mb-2 px-2 text-[11px] font-semibold tracking-wider text-text-muted uppercase">
            {t("nav.continueReading")}
          </p>
          <button
            onClick={() => openBook(current.id)}
            className="transition-fast group flex w-full items-center gap-3 rounded-xl border border-transparent p-2 text-left hover:border-border hover:bg-bg-elevated hover:shadow-card"
          >
            <span className="h-16 w-11 shrink-0 overflow-hidden rounded-md shadow-card">
              <Cover book={current} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{current.title}</span>
              <span className="mt-0.5 block truncate text-xs text-text-muted">
                {current.author ?? t("library.unknownAuthor")}
              </span>
              <span className="mt-2 flex items-center gap-2">
                <span className="h-1 flex-1 overflow-hidden rounded-full bg-border">
                  <span
                    className="block h-full rounded-full bg-accent"
                    style={{ width: `${Math.round(current.progress * 100)}%` }}
                  />
                </span>
                <span className="text-[11px] text-text-muted tabular-nums">
                  {Math.round(current.progress * 100)}%
                </span>
              </span>
            </span>
          </button>
        </section>
      )}

      <div className="mt-auto flex flex-col gap-1 border-t border-border pt-2">
        <button
          onClick={() => setShortcutsOpen(true)}
          title={sidebarCollapsed ? t("nav.shortcuts") : undefined}
          className="transition-fast flex h-10 items-center gap-3 rounded-xl px-3 text-sm text-text-muted hover:bg-bg-sunken hover:text-text"
        >
          <Icon name="keyboard" size={18} className="shrink-0" />
          {!sidebarCollapsed && <span>{t("nav.shortcuts")}</span>}
          {!sidebarCollapsed && (
            <kbd className="ml-auto font-mono text-[11px] text-text-muted">?</kbd>
          )}
        </button>
        {navButton("settings", "settings", t("nav.settings"))}
        <button
          onClick={toggleSidebar}
          aria-label={sidebarCollapsed ? t("nav.expand") : t("nav.collapse")}
          title={sidebarCollapsed ? t("nav.expand") : undefined}
          className="transition-fast flex h-10 items-center gap-3 rounded-xl px-3 text-sm text-text-muted hover:bg-bg-sunken hover:text-text"
        >
          <Icon
            name="chevronDoubleLeft"
            size={17}
            className={cn("shrink-0 transition-transform", sidebarCollapsed && "rotate-180")}
          />
          {!sidebarCollapsed && <span>{t("nav.collapse")}</span>}
        </button>
      </div>
    </aside>
  );
}
