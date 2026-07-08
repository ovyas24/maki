import type { Annotation, Book } from "../../ipc";

/** Render a book's annotations as a readable Markdown document. */
export function annotationsToMarkdown(book: Book, annotations: Annotation[]): string {
  const lines: string[] = [`# ${book.title}`];
  if (book.author) lines.push(`by ${book.author}`);
  lines.push("", `${annotations.length} annotation${annotations.length === 1 ? "" : "s"}`, "");
  for (const a of annotations) {
    const date = new Date(a.createdAt * 1000).toISOString().slice(0, 10);
    lines.push(`> ${a.text.replaceAll("\n", "\n> ")}`, "");
    if (a.note) lines.push(a.note, "");
    lines.push(`— *${a.color} ${a.style}, ${date}*`, "");
  }
  return lines.join("\n").trimEnd() + "\n";
}
