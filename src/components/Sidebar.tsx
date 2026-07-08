import { useTranslation } from "react-i18next";
import { useApp } from "../store/app";
import { Icon } from "./Icon";
import { cn } from "../lib/utils";

export function Sidebar() {
  const { t } = useTranslation();
  const { screen, goTo, sidebarCollapsed, toggleSidebar } = useApp();

  const items = [
    { key: "library", icon: "library", label: t("nav.library") },
    { key: "settings", icon: "settings", label: t("nav.settings") },
  ] as const;

  return (
    <nav
      className={cn(
        "flex shrink-0 flex-col gap-1 border-r border-border bg-bg p-2",
        "transition-[width] duration-200",
        sidebarCollapsed ? "w-13" : "w-52",
      )}
    >
      {items.map((item) => {
        const active = screen.name === item.key;
        return (
          <button
            key={item.key}
            onClick={() => goTo({ name: item.key })}
            title={sidebarCollapsed ? item.label : undefined}
            className={cn(
              "transition-fast flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm",
              active
                ? "bg-accent/12 font-medium text-accent"
                : "text-text-muted hover:bg-bg-sunken hover:text-text",
            )}
          >
            <Icon name={item.icon} size={17} className="shrink-0" />
            {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
          </button>
        );
      })}
      <button
        onClick={toggleSidebar}
        aria-label={t("nav.collapse")}
        className="transition-fast mt-auto flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-text-muted hover:bg-bg-sunken hover:text-text"
      >
        <Icon name="sidebar" size={17} className="shrink-0" />
      </button>
    </nav>
  );
}
