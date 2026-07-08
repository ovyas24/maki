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
              <div className="absolute right-2 bottom-2 drop-shadow-sm">
                <ProgressRing fraction={book.progress} />
              </div>
            </div>
            <div className="mt-2 truncate text-sm font-medium">{book.title}</div>
            <div className="truncate text-xs text-text-muted">
              {book.author ?? t("library.unknownAuthor")}
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
