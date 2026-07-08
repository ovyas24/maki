import type { Book } from "../../ipc";
import type { SortKey } from "../../store/settings";
import { fuzzyScore } from "./fuzzy";

/** Filter by fuzzy query (title + author), then sort. Pure — unit tested. */
export function filterAndSort(books: Book[], query: string, sort: SortKey): Book[] {
  const q = query.trim();
  if (q) {
    return books
      .map((book) => {
        const target = book.author ? `${book.title} ${book.author}` : book.title;
        return { book, score: fuzzyScore(q, target) };
      })
      .filter((x): x is { book: Book; score: number } => x.score !== null)
      .sort((a, b) => b.score - a.score)
      .map((x) => x.book);
  }
  const sorted = [...books];
  const cmp: Record<SortKey, (a: Book, b: Book) => number> = {
    recentlyOpened: (a, b) => (b.lastOpenedAt ?? 0) - (a.lastOpenedAt ?? 0),
    recentlyAdded: (a, b) => b.addedAt - a.addedAt,
    title: (a, b) => a.title.localeCompare(b.title),
    author: (a, b) => (a.author ?? "￿").localeCompare(b.author ?? "￿"),
    progress: (a, b) => b.progress - a.progress,
  };
  return sorted.sort(cmp[sort]);
}

/** The 4 most recently opened, in-progress books for the hero row. */
export function continueReading(books: Book[]): Book[] {
  return books
    .filter((b) => b.lastOpenedAt && !b.finished && !b.missing)
    .sort((a, b) => (b.lastOpenedAt ?? 0) - (a.lastOpenedAt ?? 0))
    .slice(0, 4);
}
