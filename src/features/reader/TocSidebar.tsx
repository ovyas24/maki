import { useTranslation } from "react-i18next";
import type { TocItem } from "foliate-js/view.js";
import type { Bookmark } from "../../ipc";
import { Icon } from "../../components/Icon";
import { cn } from "../../lib/utils";

function TocBranch({
  items,
  depth,
  currentHref,
  onNavigate,
}: {
  items: TocItem[];
  depth: number;
  currentHref: string | undefined;
  onNavigate: (href: string) => void;
}) {
  return (
    <ul>
      {items.map((item, i) => (
        <li key={`${depth}-${i}`}>
          <button
            onClick={() => item.href && onNavigate(item.href)}
            disabled={!item.href}
            className={cn(
              "transition-fast w-full truncate rounded-md px-2.5 py-1.5 text-left text-sm",
              item.href === currentHref
                ? "bg-accent/12 font-medium text-accent"
                : "text-text-muted hover:bg-bg-sunken hover:text-text",
            )}
            style={{ paddingLeft: `${10 + depth * 14}px` }}
          >
            {item.label}
          </button>
          {item.subitems?.length ? (
            <TocBranch
              items={item.subitems}
              depth={depth + 1}
              currentHref={currentHref}
              onNavigate={onNavigate}
            />
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export function TocSidebar({
  toc,
  currentHref,
  onNavigate,
  bookmarks,
  onJumpBookmark,
  onDeleteBookmark,
}: {
  toc: TocItem[];
  currentHref: string | undefined;
  onNavigate: (href: string) => void;
  bookmarks: Bookmark[];
  onJumpBookmark: (cfi: string) => void;
  onDeleteBookmark: (id: number) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="h-full overflow-y-auto p-2">
      {bookmarks.length > 0 && (
        <div className="mb-3 border-b border-border pb-2">
          <div className="px-2.5 py-1 text-xs font-semibold tracking-wide text-text-muted uppercase">
            {t("reader.bookmarks")}
          </div>
          {bookmarks.map((b) => (
            <div key={b.id} className="group flex items-center">
              <button
                onClick={() => onJumpBookmark(b.cfi)}
                className="transition-fast flex min-w-0 flex-1 items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm text-text-muted hover:bg-bg-sunken hover:text-text"
              >
                <Icon name="bookmarkFilled" size={13} className="shrink-0 text-accent" />
                <span className="truncate">{b.label || t("reader.bookmarks")}</span>
              </button>
              <button
                aria-label={t("reader.removeBookmark")}
                onClick={() => onDeleteBookmark(b.id)}
                className="transition-fast mr-1 rounded-md p-1 text-text-muted opacity-0 group-hover:opacity-100 hover:text-red-500"
              >
                <Icon name="trash" size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
      <TocBranch items={toc} depth={0} currentHref={currentHref} onNavigate={onNavigate} />
    </div>
  );
}
