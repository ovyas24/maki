import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "../../components/Icon";
import { Button } from "../../components/Dialog";
import { ANNOTATION_COLORS, type Rect } from "../reader/FoliateReader";
import { cn } from "../../lib/utils";

export interface PopoverState {
  rect: Rect;
  /** Existing annotation id when opened from a highlight click. */
  annotationId?: number;
  cfi: string;
  text: string;
  note?: string | null;
  color?: string;
  style?: string;
}

interface Props {
  state: PopoverState;
  onHighlight: (color: string, style: "highlight" | "underline") => void;
  onSaveNote: (note: string) => void;
  onDelete?: () => void;
  onClose: () => void;
}

export function SelectionPopover({ state, onHighlight, onSaveNote, onDelete, onClose }: Props) {
  const { t } = useTranslation();
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState(state.note ?? "");
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Position below the selection, clamped to the window.
  const width = 288;
  const left = Math.min(
    Math.max((state.rect.left + state.rect.right) / 2 - width / 2, 8),
    window.innerWidth - width - 8,
  );
  const below = state.rect.bottom + 8;
  const top = below + 180 > window.innerHeight ? Math.max(state.rect.top - 190, 8) : below;

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [onClose]);

  const isExisting = state.annotationId !== undefined;

  return (
    <div
      ref={ref}
      className="pop-in fixed z-40 rounded-xl border border-border bg-bg-elevated p-2.5 shadow-lift"
      style={{ left, top, width }}
    >
      <div className="flex items-center gap-1.5">
        {Object.entries(ANNOTATION_COLORS).map(([name, hex]) => (
          <button
            key={name}
            aria-label={t(`annotations.colors.${name}`)}
            title={t(`annotations.colors.${name}`)}
            onClick={() => onHighlight(name, "highlight")}
            className={cn(
              "transition-fast h-6 w-6 rounded-full hover:scale-110",
              state.color === name && state.style === "highlight" && "ring-2 ring-text/50",
            )}
            style={{ background: hex }}
          />
        ))}
        <button
          aria-label={t("annotations.underline")}
          title={t("annotations.underline")}
          onClick={() => onHighlight(state.color ?? "yellow", "underline")}
          className={cn(
            "transition-fast flex h-6 w-6 items-center justify-center rounded-md text-text-muted hover:bg-bg-sunken hover:text-text",
            state.style === "underline" && "bg-bg-sunken text-text",
          )}
        >
          <Icon name="underline" size={14} />
        </button>
        <div className="mx-0.5 h-5 w-px bg-border" />
        <button
          aria-label={t("annotations.note")}
          title={t("annotations.note")}
          onClick={() => setNoteOpen((v) => !v)}
          className="transition-fast flex h-6 w-6 items-center justify-center rounded-md text-text-muted hover:bg-bg-sunken hover:text-text"
        >
          <Icon name="note" size={14} />
        </button>
        <button
          aria-label={t("annotations.copy")}
          title={copied ? t("annotations.copied") : t("annotations.copy")}
          onClick={() => {
            void navigator.clipboard.writeText(state.text).then(() => setCopied(true));
          }}
          className="transition-fast flex h-6 w-6 items-center justify-center rounded-md text-text-muted hover:bg-bg-sunken hover:text-text"
        >
          <Icon name={copied ? "check" : "copy"} size={14} />
        </button>
        {isExisting && onDelete && (
          <button
            aria-label={t("annotations.delete")}
            title={t("annotations.delete")}
            onClick={onDelete}
            className="transition-fast ml-auto flex h-6 w-6 items-center justify-center rounded-md text-text-muted hover:bg-bg-sunken hover:text-red-500"
          >
            <Icon name="trash" size={14} />
          </button>
        )}
      </div>
      {noteOpen && (
        <div className="mt-2.5">
          <textarea
            autoFocus
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t("annotations.addNote")}
            rows={3}
            className="w-full resize-none rounded-lg border border-border bg-bg p-2 text-sm outline-none focus:border-accent"
          />
          <div className="mt-1.5 flex justify-end gap-1.5">
            <Button variant="ghost" onClick={() => setNoteOpen(false)}>
              {t("annotations.cancel")}
            </Button>
            <Button variant="primary" onClick={() => onSaveNote(note)}>
              {t("annotations.save")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
