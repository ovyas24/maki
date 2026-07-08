import { getCurrentWindow } from "@tauri-apps/api/window";
import { useTranslation } from "react-i18next";
import { Icon } from "./Icon";
import { cn } from "../lib/utils";

/**
 * Custom titlebar (native decorations are off). The whole strip is a drag
 * region except interactive children, which must set data-no-drag.
 */
export function Titlebar({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  const { t } = useTranslation();
  const win = getCurrentWindow();
  return (
    <header
      data-tauri-drag-region
      className={cn(
        "relative z-20 flex h-11 shrink-0 items-center gap-2 border-b border-border bg-bg px-2",
        className,
      )}
    >
      {children}
      <div className="ml-auto flex items-center" data-no-drag>
        <WindowButton label={t("titlebar.minimize")} onClick={() => void win.minimize()}>
          <Icon name="minus" size={14} />
        </WindowButton>
        <WindowButton label={t("titlebar.maximize")} onClick={() => void win.toggleMaximize()}>
          <Icon name="square" size={12} />
        </WindowButton>
        <WindowButton label={t("titlebar.close")} onClick={() => void win.close()} close>
          <Icon name="x" size={14} />
        </WindowButton>
      </div>
    </header>
  );
}

function WindowButton({
  label,
  onClick,
  close,
  children,
}: {
  label: string;
  onClick: () => void;
  close?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "transition-fast flex h-8 w-10 items-center justify-center rounded-md text-text-muted",
        close ? "hover:bg-red-500 hover:text-white" : "hover:bg-bg-sunken hover:text-text",
      )}
    >
      {children}
    </button>
  );
}
