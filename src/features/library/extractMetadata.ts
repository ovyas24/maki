// Metadata + cover extraction happens in the webview via foliate-js (the
// Rust side never parses book formats — see docs/ARCHITECTURE.md).
import { makeBook, type FoliateBook, type MetadataValue } from "foliate-js/view.js";
import * as ipc from "../../ipc";
import type { Book } from "../../ipc";

/** EPUB metadata values may be language maps or contributor objects. */
export function metaToString(value: MetadataValue | MetadataValue[] | undefined): string | null {
  if (value == null) return null;
  if (Array.isArray(value)) {
    const parts = value.map(metaToString).filter((x): x is string => !!x);
    return parts.length ? parts.join(", ") : null;
  }
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "object") {
    if ("name" in value && value.name !== undefined) return metaToString(value.name);
    const first = Object.values(value).find((v) => typeof v === "string");
    return typeof first === "string" ? first.trim() || null : null;
  }
  return null;
}

export async function loadBookFile(book: Book): Promise<File> {
  const bytes = await ipc.readBookBytes(book.id);
  const name = book.path.split("/").pop() ?? "book";
  return new File([bytes], name);
}

async function extractOne(book: Book): Promise<Partial<Book>> {
  const file = await loadBookFile(book);
  const parsed: FoliateBook = await makeBook(file);
  try {
    const m = parsed.metadata ?? {};
    const fields = {
      title: metaToString(m.title) ?? book.title,
      author: metaToString(m.author),
      language: Array.isArray(m.language) ? (m.language[0] ?? null) : (m.language ?? null),
      description: typeof m.description === "string" ? m.description : null,
    };
    await ipc.setBookMetadata(book.id, fields);
    let coverPath = book.coverPath;
    const cover = await parsed.getCover?.().catch(() => null);
    if (cover && cover.size > 0) {
      const bytes = new Uint8Array(await cover.arrayBuffer());
      coverPath = await ipc.saveCover(book.id, bytes);
    }
    return { ...fields, coverPath, metadataExtracted: true };
  } finally {
    parsed.destroy?.();
  }
}

/**
 * Extract metadata for all pending books, one at a time to keep the UI
 * responsive. Calls `onExtracted` with patched fields as each finishes.
 */
export async function extractPendingMetadata(
  books: Book[],
  onExtracted: (id: number, fields: Partial<Book>) => void,
): Promise<void> {
  for (const book of books) {
    if (book.metadataExtracted || book.missing) continue;
    try {
      onExtracted(book.id, await extractOne(book));
    } catch (e) {
      console.warn(`metadata extraction failed for ${book.path}`, e);
      // Mark as extracted so we don't retry on every launch; the filename
      // title remains usable.
      await ipc.setBookMetadata(book.id, { title: book.title }).catch(() => {});
      onExtracted(book.id, { metadataExtracted: true });
    }
  }
}
