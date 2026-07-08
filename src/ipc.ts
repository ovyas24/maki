// The single frontend/backend boundary. Every Tauri invoke goes through here,
// typed against the ts-rs-generated bindings in src/bindings (regenerate with
// `pnpm gen-types` after changing Rust models).
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { Annotation } from "./bindings/Annotation";
import type { Book } from "./bindings/Book";
import type { ImportResult } from "./bindings/ImportResult";
import type { NewAnnotation } from "./bindings/NewAnnotation";
import type { WatchFolder } from "./bindings/WatchFolder";

export type { Annotation, Book, ImportResult, NewAnnotation, WatchFolder };

export const listBooks = () => invoke<Book[]>("list_books");

/** FTS5 search over metadata + annotations; returns book ids ranked by relevance. */
export const searchLibrary = (query: string) => invoke<number[]>("search", { query });

export const importFiles = (paths: string[]) => invoke<ImportResult[]>("import_files", { paths });

export const readBookBytes = async (id: number): Promise<ArrayBuffer> =>
  invoke<ArrayBuffer>("read_book_bytes", { id });

export const setBookMetadata = (
  id: number,
  meta: {
    title: string;
    author?: string | null;
    language?: string | null;
    description?: string | null;
  },
) => invoke<void>("set_book_metadata", { id, ...meta });

export const saveCover = (id: number, bytes: Uint8Array) =>
  invoke<string>("save_cover", { id, bytes: Array.from(bytes) });

export const saveProgress = (id: number, location: string, progress: number) =>
  invoke<void>("save_progress", { id, location, progress });

export const markOpened = (id: number) => invoke<void>("mark_opened", { id });

export const setFinished = (id: number, finished: boolean) =>
  invoke<void>("set_finished", { id, finished });

export const removeBook = (id: number, deleteFile: boolean) =>
  invoke<void>("remove_book", { id, deleteFile });

export const listAnnotations = (bookId: number) =>
  invoke<Annotation[]>("list_annotations", { bookId });

export const addAnnotation = (annotation: NewAnnotation) =>
  invoke<Annotation>("add_annotation", { annotation });

export const updateAnnotation = (
  id: number,
  fields: { note: string | null; color: string; style: string },
) => invoke<void>("update_annotation", { id, ...fields });

export const deleteAnnotation = (id: number) => invoke<void>("delete_annotation", { id });

export const listWatchFolders = () => invoke<WatchFolder[]>("list_watch_folders");

export const addWatchFolder = (path: string) => invoke<WatchFolder[]>("add_watch_folder", { path });

export const removeWatchFolder = (id: number) =>
  invoke<WatchFolder[]>("remove_watch_folder", { id });

/** Write text to a destination chosen via the native save dialog. */
export const saveTextFile = (path: string, contents: string) =>
  invoke<void>("save_text_file", { path, contents });

export const getSettings = () => invoke<Record<string, unknown>>("get_settings");

export const saveSettings = (settings: Record<string, unknown>) =>
  invoke<void>("save_settings", { settings });

/** Books imported in the background (watch folders). */
export const onLibraryUpdated = (handler: (books: Book[]) => void): Promise<UnlistenFn> =>
  listen<Book[]>("library-updated", (event) => handler(event.payload));
