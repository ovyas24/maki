import { useCallback, useEffect, useRef, useState } from "react";
import "foliate-js/view.js";
import type { FoliateView, Relocation, TocItem } from "foliate-js/view.js";
import { Overlayer } from "foliate-js/overlayer.js";
import type { Annotation, Book } from "../../ipc";
import { useSettings, type ReaderSettings } from "../../store/settings";
import { cn, prefersReducedMotion } from "../../lib/utils";
import { loadBookFile, metaToString } from "../library/extractMetadata";
import { readerCSS } from "./themes";
import { READER_FONTS } from "./fonts";

export interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface SelectionInfo {
  cfi: string;
  text: string;
  rect: Rect;
}

export const ANNOTATION_COLORS: Record<string, string> = {
  yellow: "#eab308",
  green: "#22c55e",
  blue: "#3b82f6",
  pink: "#ec4899",
};

interface Props {
  book: Book;
  annotations: Annotation[];
  viewRef: React.MutableRefObject<FoliateView | null>;
  onReady: (info: { toc: TocItem[]; title: string }) => void;
  onRelocate: (detail: Relocation) => void;
  onSelection: (sel: SelectionInfo | null) => void;
  onAnnotationClick: (cfi: string, rect: Rect) => void;
  onError: (error: unknown) => void;
}

/** Typed helper for foliate-view's CustomEvents. */
function on<T>(target: EventTarget, name: string, handler: (detail: T) => void) {
  target.addEventListener(name, (e) => handler((e as CustomEvent<T>).detail));
}

function frameRect(doc: Document): Rect {
  const frame = doc.defaultView?.frameElement;
  return frame ? frame.getBoundingClientRect() : { left: 0, top: 0, right: 0, bottom: 0 };
}

function applySettings(view: FoliateView, settings: ReaderSettings) {
  const { renderer } = view;
  if (!renderer) return;
  renderer.setAttribute("flow", settings.flow);
  renderer.setAttribute("gap", `${settings.margin}%`);
  // "single" forces one column; "auto"/"double" allow a two-page spread when
  // the window is wide enough (foliate collapses to one on narrow widths).
  renderer.setAttribute("max-column-count", settings.columns === "single" ? "1" : "2");
  renderer.setAttribute("max-inline-size", `${settings.lineWidth}px`);
  renderer.setAttribute("margin", "44px");
  // foliate's paginator animates page-turn scrolls when `animated` is present.
  if (settings.pageAnimation && settings.flow === "paginated" && !prefersReducedMotion()) {
    renderer.setAttribute("animated", "");
  } else {
    renderer.removeAttribute("animated");
  }
  renderer.setStyles?.(readerCSS(settings, READER_FONTS));
}

export function FoliateReader(props: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const readerSettings = useSettings((s) => s.reader);

  // Refs so the one-time open effect and event handlers see current values.
  const propsRef = useRef(props);
  const settingsRef = useRef(readerSettings);
  const annsRef = useRef<Map<string, Annotation>>(new Map());
  const drawnRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    propsRef.current = props;
    settingsRef.current = readerSettings;
    annsRef.current = new Map(props.annotations.map((a) => [a.cfi, a]));
  });

  // Paper page-turn effect: ambient shading plus a soft fold and reflected
  // paper edge sweep with foliate's own 300 ms page slide. `k` retriggers the
  // CSS animation on each turn.
  const [turn, setTurn] = useState<{ dir: "next" | "prev"; k: number } | null>(null);
  const turnKey = useRef(0);
  const turnTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const playTurn = useCallback((dir: "next" | "prev") => {
    const s = settingsRef.current;
    if (!s.pageAnimation || s.flow !== "paginated" || prefersReducedMotion()) return;
    turnKey.current += 1;
    setTurn({ dir, k: turnKey.current });
    clearTimeout(turnTimer.current);
    turnTimer.current = setTimeout(() => setTurn(null), 340);
  }, []);

  // Open the book once per book id.
  useEffect(() => {
    let disposed = false;
    let view: FoliateView | null = null;
    const container = containerRef.current;
    if (!container) return;

    (async () => {
      const file = await loadBookFile(propsRef.current.book);
      if (disposed) return;
      view = document.createElement("foliate-view") as FoliateView;
      view.style.width = "100%";
      view.style.height = "100%";
      container.append(view);

      // Every page turn (keys, click zones, wheel, goLeft/goRight) routes
      // through next/prev, so wrapping these two plays the paper effect once,
      // centrally, without touching each call site.
      const nav = view as unknown as {
        next: (d?: number) => Promise<void>;
        prev: (d?: number) => Promise<void>;
      };
      const origNext = nav.next.bind(view);
      const origPrev = nav.prev.bind(view);
      // Skip the effect at book boundaries: foliate's next/prev no-op when
      // there's no adjacent page, so animating there would be a phantom turn.
      nav.next = (d?: number) => {
        if (!view?.renderer?.atEnd) playTurn("next");
        return origNext(d);
      };
      nav.prev = (d?: number) => {
        if (!view?.renderer?.atStart) playTurn("prev");
        return origPrev(d);
      };

      on<Relocation>(view, "relocate", (detail) => propsRef.current.onRelocate(detail));
      on<{ doc: Document; index: number }>(view, "load", ({ doc, index }) =>
        wireDocument(doc, index),
      );
      on<{
        draw: (fn: unknown, opts?: unknown) => void;
        annotation: { value: string };
      }>(view, "draw-annotation", ({ draw, annotation }) => {
        const a = annsRef.current.get(annotation.value);
        if (!a) return;
        const color = ANNOTATION_COLORS[a.color] ?? ANNOTATION_COLORS.yellow;
        if (a.style === "underline") draw(Overlayer.underline, { color });
        else draw(Overlayer.highlight, { color: `${color}55` });
      });
      on<{ value: string; range: Range; index: number }>(
        view,
        "show-annotation",
        ({ value, range }) => {
          const doc = range.startContainer.ownerDocument;
          const r = range.getBoundingClientRect();
          const f = doc ? frameRect(doc) : { left: 0, top: 0 };
          propsRef.current.onAnnotationClick(value, {
            left: f.left + r.left,
            top: f.top + r.top,
            right: f.left + r.right,
            bottom: f.top + r.bottom,
          });
        },
      );
      // Sections render lazily; re-draw this section's annotations when its
      // overlay is (re)created.
      on<{ index: number }>(view, "create-overlay", ({ index }) => {
        if (!view) return;
        for (const a of annsRef.current.values()) {
          try {
            if (view.resolveCFI(a.cfi).index === index) void view.addAnnotation({ value: a.cfi });
          } catch {
            // unresolvable CFI (book content changed) — skip
          }
        }
      });

      await view.open(file);
      if (disposed) {
        view.close();
        view.remove();
        return;
      }
      propsRef.current.viewRef.current = view;
      applySettings(view, settingsRef.current);
      const { book } = propsRef.current;
      propsRef.current.onReady({
        toc: view.book.toc ?? [],
        title: metaToString(view.book.metadata?.title) ?? book.title,
      });
      await view.init({ lastLocation: book.location, showTextStart: !book.location });
      drawnRef.current = new Set(annsRef.current.keys());
    })().catch((e) => {
      if (!disposed) propsRef.current.onError(e);
    });

    function wireDocument(doc: Document, index: number) {
      doc.addEventListener("pointerup", () => {
        const sel = doc.getSelection();
        if (!sel || sel.isCollapsed || !view) {
          propsRef.current.onSelection(null);
          return;
        }
        const range = sel.getRangeAt(0);
        const text = sel.toString().trim();
        if (!text) {
          propsRef.current.onSelection(null);
          return;
        }
        const r = range.getBoundingClientRect();
        const f = frameRect(doc);
        propsRef.current.onSelection({
          cfi: view.getCFI(index, range),
          text,
          rect: {
            left: f.left + r.left,
            top: f.top + r.top,
            right: f.left + r.right,
            bottom: f.top + r.bottom,
          },
        });
      });

      // Click zones: outer thirds page-turn in paginated mode.
      doc.addEventListener("click", (e) => {
        if (!view || settingsRef.current.flow !== "paginated") return;
        if (e.defaultPrevented) return;
        if ((e.target as Element | null)?.closest?.("a[href]")) return;
        const sel = doc.getSelection();
        if (sel && !sel.isCollapsed) return;
        const f = frameRect(doc);
        const x = f.left + e.clientX;
        const w = window.innerWidth;
        if (x < w / 3) void view.goLeft();
        else if (x > (2 * w) / 3) void view.goRight();
      });

      // Vertical wheel turns pages in paginated mode (Apple Books behavior).
      let wheelAccum = 0;
      let wheelReset: ReturnType<typeof setTimeout> | undefined;
      doc.addEventListener(
        "wheel",
        (e) => {
          if (!view || settingsRef.current.flow !== "paginated") return;
          wheelAccum += e.deltaY;
          clearTimeout(wheelReset);
          wheelReset = setTimeout(() => (wheelAccum = 0), 200);
          if (Math.abs(wheelAccum) > 90) {
            if (wheelAccum > 0) void view.next();
            else void view.prev();
            wheelAccum = 0;
          }
        },
        { passive: true },
      );

      // Forward keys to the app's global shortcut handler.
      doc.addEventListener("keydown", (e) => {
        window.dispatchEvent(
          new KeyboardEvent("keydown", {
            key: e.key,
            code: e.code,
            ctrlKey: e.ctrlKey,
            metaKey: e.metaKey,
            shiftKey: e.shiftKey,
            altKey: e.altKey,
          }),
        );
      });
    }

    return () => {
      disposed = true;
      propsRef.current.viewRef.current = null;
      view?.close();
      view?.remove();
    };
  }, [props.book.id, playTurn]);

  // Re-apply typography/theme when settings change.
  useEffect(() => {
    const view = props.viewRef.current;
    if (view) applySettings(view, readerSettings);
  }, [readerSettings, props.viewRef]);

  // Sync annotation overlays when the list changes.
  useEffect(() => {
    const view = props.viewRef.current;
    if (!view) return;
    const current = new Set(props.annotations.map((a) => a.cfi));
    for (const cfi of drawnRef.current) {
      if (!current.has(cfi)) void view.deleteAnnotation({ value: cfi });
    }
    for (const cfi of current) {
      if (!drawnRef.current.has(cfi)) void view.addAnnotation({ value: cfi });
    }
    drawnRef.current = current;
  }, [props.annotations, props.viewRef]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      {turn && (
        <div
          key={turn.k}
          aria-hidden
          className={cn(
            "page-turn pointer-events-none absolute inset-0 overflow-hidden",
            turn.dir === "next" ? "page-turn-next" : "page-turn-prev",
          )}
        >
          <span className="page-turn-fold" />
          <span className="page-turn-edge" />
        </div>
      )}
    </div>
  );
}
