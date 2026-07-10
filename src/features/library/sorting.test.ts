import { describe, expect, it } from "vitest";
import { continueReading, filterAndSort, filterByStatus } from "./sorting";
import type { Book } from "../../ipc";

const book = (over: Partial<Book>): Book => ({
  id: 1,
  path: "/b.epub",
  contentHash: "x",
  format: "epub",
  title: "Untitled",
  author: null,
  language: null,
  description: null,
  coverPath: null,
  fileSize: 1,
  addedAt: 0,
  lastOpenedAt: null,
  progress: 0,
  location: null,
  finished: false,
  missing: false,
  metadataExtracted: true,
  ...over,
});

const books = [
  book({ id: 1, title: "Moby-Dick", author: "Herman Melville", lastOpenedAt: 100, progress: 0.5 }),
  book({ id: 2, title: "Dune", author: "Frank Herbert", lastOpenedAt: 300, progress: 0.1 }),
  book({
    id: 3,
    title: "Emma",
    author: "Jane Austen",
    addedAt: 50,
    progress: 0.9,
    finished: true,
    lastOpenedAt: 200,
  }),
];

describe("filterAndSort", () => {
  it("sorts by recently opened, never-opened last", () => {
    const ids = filterAndSort([...books, book({ id: 4 })], "", "recentlyOpened").map((b) => b.id);
    expect(ids).toEqual([2, 3, 1, 4]);
  });

  it("sorts by title", () => {
    const ids = filterAndSort(books, "", "title").map((b) => b.id);
    expect(ids).toEqual([2, 3, 1]);
  });

  it("filters with fuzzy query on title and author", () => {
    expect(filterAndSort(books, "melville", "title").map((b) => b.id)).toEqual([1]);
    expect(filterAndSort(books, "zzz", "title")).toEqual([]);
  });

  it("sorts authorless books last for author sort", () => {
    const ids = filterAndSort([...books, book({ id: 4 })], "", "author").map((b) => b.id);
    expect(ids[ids.length - 1]).toBe(4);
  });
});

describe("continueReading", () => {
  it("returns recent unfinished, non-missing books only", () => {
    const hero = continueReading([
      ...books,
      book({ id: 5, lastOpenedAt: 400, missing: true }),
      book({ id: 6 }),
    ]);
    expect(hero.map((b) => b.id)).toEqual([2, 1]);
  });
});

describe("filterByStatus", () => {
  const states = [
    book({ id: 1, progress: 0 }),
    book({ id: 2, progress: 0.4 }),
    book({ id: 3, progress: 1, finished: true }),
    book({ id: 4, progress: 0.2, missing: true }),
  ];

  it("separates active reading states and excludes missing books", () => {
    expect(filterByStatus(states, "unread").map((b) => b.id)).toEqual([1]);
    expect(filterByStatus(states, "reading").map((b) => b.id)).toEqual([2]);
    expect(filterByStatus(states, "finished").map((b) => b.id)).toEqual([3]);
    expect(filterByStatus(states, "missing").map((b) => b.id)).toEqual([4]);
  });

  it("returns the original collection for all", () => {
    expect(filterByStatus(states, "all")).toBe(states);
  });
});
