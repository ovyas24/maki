import { useTranslation } from "react-i18next";
import type { Book } from "../../ipc";
import { Cover } from "../../components/Cover";
import { ProgressRing } from "../../components/ProgressRing";
import { useApp } from "../../store/app";

/** Hero row: the 4 most recent in-progress books with large covers. */
export function ContinueReading({ books }: { books: Book[] }) {
  const { t } = useTranslation();
  const openBook = useApp((s) => s.openBook);
  if (!books.length) return null;
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-lg font-semibold">{t("library.continueReading")}</h2>
      <div className="flex gap-5 overflow-x-auto pb-2">
        {books.map((book) => (
          <button
            key={book.id}
            onClick={() => openBook(book.id)}
            className="group w-40 shrink-0 text-left"
          >
            <div className="transition-fast relative aspect-2/3 overflow-hidden rounded-lg shadow-card group-hover:-translate-y-0.5 group-hover:shadow-lift">
              <Cover book={book} />
              <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/65 to-transparent opacity-0 transition-opacity duration-150 group-hover:opacity-100" />
              <span className="absolute bottom-3 left-3 translate-y-1 rounded-full bg-white/92 px-2.5 py-1 text-xs font-semibold text-stone-900 opacity-0 shadow-sm transition-all duration-150 group-hover:translate-y-0 group-hover:opacity-100">
                {t("library.resume")}
              </span>
              <div className="absolute right-2 bottom-2 drop-shadow-sm">
                <ProgressRing fraction={book.progress} />
              </div>
            </div>
            <div className="mt-2 truncate text-sm font-medium">{book.title}</div>
            <div className="flex items-center justify-between gap-2 text-xs text-text-muted">
              <span className="truncate">{book.author ?? t("library.unknownAuthor")}</span>
              <span className="shrink-0 tabular-nums">{Math.round(book.progress * 100)}%</span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
