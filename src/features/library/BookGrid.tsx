import { useTranslation } from "react-i18next";
import type { Book } from "../../ipc";
import { Cover } from "../../components/Cover";
import { Icon } from "../../components/Icon";
import { useApp } from "../../store/app";
import { cn } from "../../lib/utils";

export function BookGrid({ books, onRemove }: { books: Book[]; onRemove: (book: Book) => void }) {
  const { t } = useTranslation();
  const openBook = useApp((s) => s.openBook);
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(148px,1fr))] gap-x-5 gap-y-7">
      {books.map((book) => (
        <div key={book.id} className="group relative">
          <button
            onClick={() => !book.missing && openBook(book.id)}
            className={cn("w-full text-left", book.missing && "cursor-not-allowed opacity-60")}
            title={book.missing ? t("library.missingFile") : book.title}
          >
            <div className="transition-fast relative aspect-2/3 overflow-hidden rounded-lg shadow-card group-hover:-translate-y-0.5 group-hover:shadow-lift">
              <Cover book={book} />
              {book.missing && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white">
                  <Icon name="warning" size={24} />
                </div>
              )}
              {book.progress > 0 && !book.finished && (
                <div className="absolute inset-x-0 bottom-0 h-1 bg-black/25">
                  <div
                    className="h-full bg-accent"
                    style={{ width: `${Math.round(book.progress * 100)}%` }}
                  />
                </div>
              )}
              {book.finished && (
                <div className="absolute right-1.5 bottom-1.5 rounded-full bg-accent p-1 text-accent-contrast">
                  <Icon name="check" size={11} />
                </div>
              )}
            </div>
            <div className="mt-2 line-clamp-2 text-sm leading-tight font-medium">{book.title}</div>
            <div className="mt-0.5 truncate text-xs text-text-muted">
              {book.author ?? t("library.unknownAuthor")}
            </div>
          </button>
          <button
            aria-label={t("annotations.delete")}
            onClick={() => onRemove(book)}
            className="transition-fast absolute top-1.5 right-1.5 rounded-md bg-black/55 p-1.5 text-white opacity-0 group-hover:opacity-100 hover:bg-black/75"
          >
            <Icon name="trash" size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}
