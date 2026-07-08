import { useTranslation } from "react-i18next";
import { save as saveFileDialog } from "@tauri-apps/plugin-dialog";
import type { Annotation, Book } from "../../ipc";
import { saveTextFile } from "../../ipc";
import { Icon } from "../../components/Icon";
import { ANNOTATION_COLORS } from "../reader/FoliateReader";
import { annotationsToMarkdown } from "./exportMarkdown";

export function AnnotationsSidebar({
  book,
  annotations,
  onJump,
  onDelete,
}: {
  book: Book;
  annotations: Annotation[];
  onJump: (annotation: Annotation) => void;
  onDelete: (annotation: Annotation) => void;
}) {
  const { t } = useTranslation();

  const exportMarkdown = async () => {
    const dest = await saveFileDialog({
      defaultPath: `${book.title}.md`,
      filters: [{ name: "Markdown", extensions: ["md"] }],
    });
    if (dest) await saveTextFile(dest, annotationsToMarkdown(book, annotations));
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto p-3">
        {annotations.length === 0 ? (
          <p className="mt-8 px-3 text-center text-sm text-text-muted">{t("annotations.empty")}</p>
        ) : (
          annotations.map((a) => (
            <div
              key={a.id}
              className="group transition-fast mb-2 cursor-pointer rounded-lg border border-border bg-bg p-3 hover:border-accent/50"
              onClick={() => onJump(a)}
            >
              <div className="flex items-start gap-2">
                <span
                  className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: ANNOTATION_COLORS[a.color] ?? ANNOTATION_COLORS.yellow }}
                />
                <p className="line-clamp-4 flex-1 text-sm leading-snug">{a.text}</p>
                <button
                  aria-label={t("annotations.delete")}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(a);
                  }}
                  className="transition-fast text-text-muted opacity-0 group-hover:opacity-100 hover:text-red-500"
                >
                  <Icon name="trash" size={13} />
                </button>
              </div>
              {a.note && (
                <p className="mt-2 border-l-2 border-border pl-2 text-xs text-text-muted">
                  {a.note}
                </p>
              )}
            </div>
          ))
        )}
      </div>
      {annotations.length > 0 && (
        <div className="border-t border-border p-3">
          <button
            onClick={() => void exportMarkdown()}
            className="transition-fast flex w-full items-center justify-center gap-2 rounded-lg border border-border py-2 text-sm text-text-muted hover:bg-bg-sunken hover:text-text"
          >
            <Icon name="download" size={14} />
            {t("annotations.export")}
          </button>
        </div>
      )}
    </div>
  );
}
