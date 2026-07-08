import { describe, expect, it } from "vitest";
import { annotationsToMarkdown } from "./exportMarkdown";
import type { Annotation, Book } from "../../ipc";

const book = {
  title: "Moby-Dick",
  author: "Herman Melville",
} as Book;

const ann = (over: Partial<Annotation>): Annotation => ({
  id: 1,
  bookId: 1,
  cfi: "epubcfi(/6/4!/4/2,/1:0,/1:5)",
  text: "Call me Ishmael.",
  note: null,
  color: "yellow",
  style: "highlight",
  createdAt: 1700000000,
  ...over,
});

describe("annotationsToMarkdown", () => {
  it("renders title, author, quotes and notes", () => {
    const md = annotationsToMarkdown(book, [
      ann({}),
      ann({ id: 2, text: "Multi\nline", note: "my thought", color: "blue" }),
    ]);
    expect(md).toContain("# Moby-Dick");
    expect(md).toContain("by Herman Melville");
    expect(md).toContain("> Call me Ishmael.");
    expect(md).toContain("> Multi\n> line");
    expect(md).toContain("my thought");
    expect(md).toContain("2 annotations");
    expect(md.endsWith("\n")).toBe(true);
  });

  it("handles empty list and singular count", () => {
    expect(annotationsToMarkdown(book, [ann({})])).toContain("1 annotation");
  });
});
