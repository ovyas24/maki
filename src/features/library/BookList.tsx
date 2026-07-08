import { useTranslation } from "react-i18next";
import type { Book } from "../../ipc";
import type { SortKey } from "../../store/settings";
import { Cover } from "../../components/Cover";
import { Icon } from "../../components/Icon";
import { useApp } from "../../store/app";
import { cn, formatRelativeTime } from "../../lib/utils";

const COLUMNS: Array<{ key: string; sort: SortKey; className: string }> = [
  { key: "title", sort: "title", className: "flex-1" },
  { key: "author", sort: "author", className: "w-48" },
  { key: "progress", sort: "progress", className: "w-28" },
  { key: "lastOpened", sort: "recentlyOpened", className: "w-32" },
];

export function BookList({
  books,
  sort,
  onSort,
  onRemove,
}: {
  books: Book[];
  sort: SortKey;
  onSort: (key: SortKey) => void;
  onRemove: (book: Book) => void;
}) {
  const { t } = useTranslation();
  const openBook = useApp((s) => s.openBook);
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-bg-elevated">
      <div className="flex items-center gap-4 border-b border-border px-4 py-2 text-xs font-medium text-text-muted">
        <span className="w-8" />
        {COLUMNS.map((col) => (
          <button
            key={col.key}
            onClick={() => onSort(col.sort)}
            className={cn(
              "transition-fast flex items-center gap-1 text-left hover:text-text",
              col.className,
              sort === col.sort && "text-accent",
            )}
          >
            {t(`library.columns.${col.key}`)}
            {sort === col.sort && <Icon name="chevronDown" size={12} />}
          </button>
        ))}
        <span className="w-8" />
      </div>
      {books.map((book) => (
        <div
          key={book.id}
          className="group flex items-center gap-4 border-b border-border px-4 py-2 last:border-b-0 hover:bg-bg-sunken"
        >
          <button
            className={cn(
              "flex min-w-0 flex-1 items-center gap-4 text-left",
              book.missing && "cursor-not-allowed opacity-60",
            )}
            onClick={() => !book.missing && openBook(book.id)}
          >
            <div className="h-12 w-8 shrink-0 overflow-hidden rounded-sm shadow-card">
              <Cover book={book} />
            </div>
            <span className="flex-1 truncate text-sm font-medium">
              {book.title}
              {book.missing && (
                <Icon name="warning" size={13} className="ml-2 inline text-red-500" />
              )}
            </span>
            <span className="w-48 truncate text-sm text-text-muted">
              {book.author ?? t("library.unknownAuthor")}
            </span>
            <span className="w-28 text-sm text-text-muted">
              {book.finished ? (
                t("library.finished")
              ) : book.progress > 0 ? (
                <span className="flex items-center gap-2">
                  <span className="h-1 w-14 overflow-hidden rounded-full bg-border">
                    <span
                      className="block h-full bg-accent"
                      style={{ width: `${Math.round(book.progress * 100)}%` }}
                    />
                  </span>
                  {Math.round(book.progress * 100)}%
                </span>
              ) : (
                "—"
              )}
            </span>
            <span className="w-32 truncate text-sm text-text-muted">
              {book.lastOpenedAt ? formatRelativeTime(book.lastOpenedAt) : t("library.never")}
            </span>
          </button>
          <button
            aria-label={t("annotations.delete")}
            onClick={() => onRemove(book)}
            className="transition-fast w-8 rounded-md p-1.5 text-text-muted opacity-0 group-hover:opacity-100 hover:text-red-500"
          >
            <Icon name="trash" size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
