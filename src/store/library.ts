import { create } from "zustand";
import * as ipc from "../ipc";
import type { Book, ImportResult } from "../ipc";

export interface ImportSummary {
  id: number;
  imported: number;
  duplicate: number;
  unsupported: number;
  failed: number;
}

export interface LibraryState {
  books: Book[];
  loaded: boolean;
  query: string;
  importSummary: ImportSummary | null;
  load: () => Promise<void>;
  setQuery: (query: string) => void;
  importPaths: (paths: string[]) => Promise<ImportResult[]>;
  remove: (id: number, deleteFile: boolean) => Promise<void>;
  upsert: (books: Book[]) => void;
  patch: (id: number, fields: Partial<Book>) => void;
  dismissImportSummary: () => void;
}

export const useLibrary = create<LibraryState>((set, get) => ({
  books: [],
  loaded: false,
  query: "",
  importSummary: null,
  load: async () => {
    const books = await ipc.listBooks();
    set({ books, loaded: true });
  },
  setQuery: (query) => set({ query }),
  importPaths: async (paths) => {
    try {
      const results = await ipc.importFiles(paths);
      const imported = results.flatMap((r) => (r.status === "imported" ? [r.book] : []));
      if (imported.length) get().upsert(imported);
      set({
        importSummary: {
          id: Date.now(),
          imported: imported.length,
          duplicate: results.filter((r) => r.status === "duplicate").length,
          unsupported: results.filter((r) => r.status === "unsupported").length,
          failed: results.filter((r) => r.status === "failed").length,
        },
      });
      return results;
    } catch (error) {
      console.error("Book import failed", error);
      set({
        importSummary: {
          id: Date.now(),
          imported: 0,
          duplicate: 0,
          unsupported: 0,
          failed: paths.length || 1,
        },
      });
      return [];
    }
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
  dismissImportSummary: () => set({ importSummary: null }),
}));
