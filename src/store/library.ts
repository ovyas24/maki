import { create } from "zustand";
import * as ipc from "../ipc";
import type { Book, ImportResult } from "../ipc";

export interface LibraryState {
  books: Book[];
  loaded: boolean;
  query: string;
  load: () => Promise<void>;
  setQuery: (query: string) => void;
  importPaths: (paths: string[]) => Promise<ImportResult[]>;
  remove: (id: number, deleteFile: boolean) => Promise<void>;
  upsert: (books: Book[]) => void;
  patch: (id: number, fields: Partial<Book>) => void;
}

export const useLibrary = create<LibraryState>((set, get) => ({
  books: [],
  loaded: false,
  query: "",
  load: async () => {
    const books = await ipc.listBooks();
    set({ books, loaded: true });
  },
  setQuery: (query) => set({ query }),
  importPaths: async (paths) => {
    const results = await ipc.importFiles(paths);
    const imported = results.flatMap((r) => (r.status === "imported" ? [r.book] : []));
    if (imported.length) get().upsert(imported);
    return results;
  },
  remove: async (id, deleteFile) => {
    await ipc.removeBook(id, deleteFile);
    set({ books: get().books.filter((b) => b.id !== id) });
  },
  upsert: (incoming) => {
    const byId = new Map(get().books.map((b) => [b.id, b]));
    for (const book of incoming) byId.set(book.id, book);
    set({ books: [...byId.values()] });
  },
  patch: (id, fields) => {
    set({ books: get().books.map((b) => (b.id === id ? { ...b, ...fields } : b)) });
  },
}));
