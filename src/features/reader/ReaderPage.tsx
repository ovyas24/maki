import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { FoliateView, Relocation, TocItem } from "foliate-js/view.js";
import * as ipc from "../../ipc";
import type { Annotation, Book, Bookmark } from "../../ipc";
import { useApp } from "../../store/app";
import { useLibrary } from "../../store/library";
import { useSettings } from "../../store/settings";
import { Icon } from "../../components/Icon";
import { Button } from "../../components/Dialog";
import { Titlebar } from "../../components/Titlebar";
import { cn, debounce } from "../../lib/utils";
import { FoliateReader, type Rect, type SelectionInfo } from "./FoliateReader";
import { READER_THEMES } from "./themes";
import { SpeedTracker, scaleTimeLeft } from "./readingSpeed";
import { useAutoScroll } from "./useAutoScroll";
import { TocSidebar } from "./TocSidebar";
import { TypographyPanel } from "./TypographyPanel";
import { DisplayPopover } from "./DisplayPopover";
import { SearchPanel } from "./SearchPanel";
import { SelectionPopover, type PopoverState } from "../annotations/SelectionPopover";
import { AnnotationsSidebar } from "../annotations/AnnotationsSidebar";

type Panel = "toc" | "annotations" | "search" | null;

export function ReaderPage({ book }: { book: Book }) {
  const { t } = useTranslation();
  const goTo = useApp((s) => s.goTo);
  const patchBook = useLibrary((s) => s.patch);
  const settings = useSettings();
  const theme = READER_THEMES[settings.reader.theme];

  const viewRef = useRef<FoliateView | null>(null);
  const [toc, setToc] = useState<TocItem[]>([]);
  const [title, setTitle] = useState(book.title);
  const [relocation, setRelocation] = useState<Relocation | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [typographyOpen, setTypographyOpen] = useState(false);
  const [displayOpen, setDisplayOpen] = useState(false);
  const [popover, setPopover] = useState<PopoverState | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [fullscreen, setFullscreen] = useState(false);
  const [autoScroll, setAutoScroll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  // Auto-scroll only runs in continuous mode; the toggle button is likewise
  // shown only there, so gating the hook is enough (no reset effect needed).
  const scrolled = settings.reader.flow === "scrolled";
  useAutoScroll(viewRef, autoScroll && scrolled, settings.reader.autoScrollSpeed);

  const speedRef = useRef(new SpeedTracker());

  // Persist progress, debounced; also keep the library list fresh.
  const persistProgress = useMemo(
    () =>
      debounce((location: string, fraction: number) => {
        void ipc.saveProgress(book.id, location, fraction);
        patchBook(book.id, { location, progress: fraction });
      }, 500),
    [book.id, patchBook],
  );

  useEffect(() => {
    void ipc.markOpened(book.id);
    settings.set({ lastBookId: book.id });
    patchBook(book.id, { lastOpenedAt: Math.floor(Date.now() / 1000) });
    void ipc.listAnnotations(book.id).then(setAnnotations);
    void ipc.listBookmarks(book.id).then(setBookmarks);
    const speed = speedRef.current;
    return () => {
      persistProgress.flush();
      // fold this session's measured speed into settings
      useSettings
        .getState()
        .set({ charsPerMinute: speed.cpm(useSettings.getState().charsPerMinute) });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book.id]);

  const onRelocate = useCallback(
    (detail: Relocation) => {
      setRelocation(detail);
      setPopover(null);
      if (detail.cfi) persistProgress(detail.cfi, detail.fraction);
      if (detail.time) speedRef.current.sample(Date.now(), detail.time.total);
    },
    [persistProgress],
  );

  const onSelection = useCallback((sel: SelectionInfo | null) => {
    setPopover(sel ? { rect: sel.rect, cfi: sel.cfi, text: sel.text } : null);
  }, []);

  const onAnnotationClick = useCallback(
    (cfi: string, rect: Rect) => {
      const a = annotations.find((x) => x.cfi === cfi);
      if (a)
        setPopover({
          rect,
          cfi,
          text: a.text,
          annotationId: a.id,
          note: a.note,
          color: a.color,
          style: a.style,
        });
    },
    [annotations],
  );

  const upsertAnnotation = useCallback(
    async (fields: { color: string; style: string; note?: string | null }) => {
      if (!popover) return;
      if (popover.annotationId !== undefined) {
        const note = fields.note !== undefined ? fields.note : (popover.note ?? null);
        await ipc.updateAnnotation(popover.annotationId, {
          note,
          color: fields.color,
          style: fields.style,
        });
        setAnnotations((list) =>
          list.map((a) =>
            a.id === popover.annotationId
              ? { ...a, note, color: fields.color, style: fields.style }
              : a,
          ),
        );
      } else {
        const created = await ipc.addAnnotation({
          bookId: book.id,
          cfi: popover.cfi,
          text: popover.text,
          note: fields.note ?? null,
          color: fields.color,
          style: fields.style,
        });
        setAnnotations((list) => [...list, created]);
      }
      viewRef.current?.deselect();
      setPopover(null);
    },
    [popover, book.id],
  );

  const removeAnnotation = useCallback(async (a: Annotation) => {
    await ipc.deleteAnnotation(a.id);
    setAnnotations((list) => list.filter((x) => x.id !== a.id));
    setPopover(null);
  }, []);

  const currentCfi = relocation?.cfi;
  const currentBookmark = bookmarks.find((b) => b.cfi === currentCfi);
  const toggleBookmark = useCallback(() => {
    if (currentBookmark) {
      void ipc.deleteBookmark(currentBookmark.id);
      setBookmarks((list) => list.filter((b) => b.id !== currentBookmark.id));
    } else if (currentCfi) {
      void ipc
        .addBookmark({
          bookId: book.id,
          cfi: currentCfi,
          label: relocation?.tocItem?.label ?? "",
        })
        .then((bm) => setBookmarks((list) => [...list, bm]));
    }
  }, [currentBookmark, currentCfi, relocation?.tocItem?.label, book.id]);

  const removeBookmark = useCallback((id: number) => {
    void ipc.deleteBookmark(id);
    setBookmarks((list) => list.filter((b) => b.id !== id));
  }, []);

  const toggleFullscreen = useCallback(() => {
    const win = getCurrentWindow();
    setFullscreen((fs) => {
      void win.setFullscreen(!fs);
      return !fs;
    });
  }, []);

  // Keyboard shortcuts (iframe keys are re-dispatched onto window).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const view = viewRef.current;
      // Any manual navigation stops auto-scroll.
      if (
        ["ArrowLeft", "ArrowRight", "PageUp", "PageDown", " ", "[", "]", "Home", "End"].includes(
          e.key,
        )
      )
        setAutoScroll(false);
      switch (e.key) {
        case "ArrowLeft":
          void view?.goLeft();
          break;
        case "ArrowRight":
          void view?.goRight();
          break;
        case "PageUp":
          void view?.prev();
          break;
        case "PageDown":
          void view?.next();
          break;
        case " ":
          e.preventDefault();
          if (e.shiftKey) void view?.prev();
          else void view?.next();
          break;
        case "[":
          void view?.renderer?.prevSection();
          break;
        case "]":
          void view?.renderer?.nextSection();
          break;
        case "Home":
          void view?.goToTextStart();
          break;
        case "End":
          void view?.renderer?.lastSection();
          break;
        case "t":
          setPanel((p) => (p === "toc" ? null : "toc"));
          break;
        case "a":
          setPanel((p) => (p === "annotations" ? null : "annotations"));
          break;
        case "f":
          if (e.ctrlKey) e.preventDefault();
          setPanel((p) => (p === "search" ? null : "search"));
          break;
        case "b":
          toggleBookmark();
          break;
        case "F11":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "Escape":
          if (fullscreen) toggleFullscreen();
          else if (popover) setPopover(null);
          else if (panel || typographyOpen || displayOpen) {
            setPanel(null);
            setTypographyOpen(false);
            setDisplayOpen(false);
          } else goTo({ name: "library" });
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    fullscreen,
    popover,
    panel,
    typographyOpen,
    displayOpen,
    goTo,
    toggleFullscreen,
    toggleBookmark,
  ]);

  const pct = relocation ? Math.round(relocation.fraction * 100) : Math.round(book.progress * 100);
  const timeLeft = relocation?.time
    ? Math.ceil(scaleTimeLeft(relocation.time.section, settings.charsPerMinute))
    : null;

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <Icon name="warning" size={40} className="text-text-muted" />
        <p className="text-text-muted">{t("reader.loadError")}</p>
        <p className="max-w-md text-center text-xs text-text-muted">{error}</p>
        <Button variant="primary" onClick={() => goTo({ name: "library" })}>
          {t("reader.backToLibrary")}
        </Button>
      </div>
    );
  }

  return (
    <div className="relative h-full" style={{ background: theme.bg }}>
      {/* top chrome: doubles as the titlebar while reading */}
      <div
        className={cn(
          "transition-fast absolute inset-x-0 top-0 z-10",
          fullscreen && "opacity-0 hover:opacity-100",
        )}
      >
        <Titlebar className="bg-bg/95 backdrop-blur">
          <IconBtn label={t("reader.backToLibrary")} onClick={() => goTo({ name: "library" })}>
            <Icon name="chevronLeft" size={17} />
          </IconBtn>
          <div className="pointer-events-none mx-2 min-w-0 flex-1 text-center">
            <span className="truncate text-sm font-medium">{title}</span>
            {relocation?.tocItem?.label && (
              <span className="ml-2 truncate text-xs text-text-muted">
                {relocation.tocItem.label}
              </span>
            )}
          </div>
          <IconBtn
            label={t("reader.contents")}
            active={panel === "toc"}
            onClick={() => setPanel((p) => (p === "toc" ? null : "toc"))}
          >
            <Icon name="toc" size={16} />
          </IconBtn>
          <IconBtn
            label={currentBookmark ? t("reader.removeBookmark") : t("reader.addBookmark")}
            active={currentBookmark !== undefined}
            onClick={toggleBookmark}
          >
            <Icon name={currentBookmark ? "bookmarkFilled" : "bookmark"} size={16} />
          </IconBtn>
          <IconBtn
            label={t("reader.search")}
            active={panel === "search"}
            onClick={() => setPanel((p) => (p === "search" ? null : "search"))}
          >
            <Icon name="search" size={16} />
          </IconBtn>
          <IconBtn
            label={t("reader.annotations")}
            active={panel === "annotations"}
            onClick={() => setPanel((p) => (p === "annotations" ? null : "annotations"))}
          >
            <Icon name="highlighter" size={16} />
          </IconBtn>
          <IconBtn
            label={t("reader.typography")}
            active={typographyOpen}
            onClick={() => {
              setTypographyOpen((v) => !v);
              setDisplayOpen(false);
            }}
          >
            <Icon name="type" size={16} />
          </IconBtn>
          <IconBtn
            label={t("reader.display")}
            active={displayOpen}
            onClick={() => {
              setDisplayOpen((v) => !v);
              setTypographyOpen(false);
            }}
          >
            <Icon name="sun" size={16} />
          </IconBtn>
          <IconBtn label={t("reader.fullscreen")} onClick={toggleFullscreen}>
            <Icon name="fullscreen" size={16} />
          </IconBtn>
        </Titlebar>
      </div>

      {/* night dimmer + warmth: sits over the book, under the chrome */}
      {(settings.reader.dimmer > 0 || settings.reader.warmth > 0) && (
        <div className="pointer-events-none absolute inset-x-0 top-11 bottom-9 z-[5]" aria-hidden>
          {settings.reader.warmth > 0 && (
            <div
              className="absolute inset-0"
              style={{ background: "#ff8a1e", opacity: settings.reader.warmth * 0.22 }}
            />
          )}
          {settings.reader.dimmer > 0 && (
            <div
              className="absolute inset-0"
              style={{ background: "#000", opacity: settings.reader.dimmer }}
            />
          )}
        </div>
      )}

      {/* book */}
      <div className="absolute inset-x-0 top-11 bottom-9">
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center text-text-muted">
            {t("common.loading")}
          </div>
        )}
        <FoliateReader
          book={book}
          annotations={annotations}
          viewRef={viewRef}
          onReady={({ toc, title }) => {
            setToc(toc);
            setTitle(title);
            setReady(true);
          }}
          onRelocate={onRelocate}
          onSelection={onSelection}
          onAnnotationClick={onAnnotationClick}
          onError={(e) => setError(String(e))}
        />
      </div>

      {/* bottom chrome */}
      <div
        className={cn(
          "transition-fast absolute inset-x-0 bottom-0 z-10 flex h-9 items-center gap-1 border-t border-border bg-bg/95 px-3 text-xs text-text-muted backdrop-blur",
          fullscreen && "opacity-0 hover:opacity-100",
        )}
      >
        <div className="flex w-44 items-center gap-2">
          {scrolled && (
            <IconBtn
              label={t("reader.autoScroll")}
              active={autoScroll}
              onClick={() => setAutoScroll((v) => !v)}
            >
              <Icon name={autoScroll ? "pause" : "play"} size={15} />
            </IconBtn>
          )}
          <span className="truncate">
            {timeLeft !== null &&
              timeLeft > 0 &&
              t("reader.timeLeftChapter", { minutes: timeLeft })}
          </span>
        </div>
        <button
          aria-label={t("reader.percent", { percent: pct })}
          className="group mx-4 h-full flex-1"
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            void viewRef.current?.goToFraction((e.clientX - r.left) / r.width);
          }}
        >
          <span className="block h-1 overflow-hidden rounded-full bg-border">
            <span
              className="block h-full rounded-full bg-accent transition-[width] duration-200"
              style={{ width: `${pct}%` }}
            />
          </span>
        </button>
        <span className="w-44 text-right">
          {relocation?.location &&
            t("reader.pageOf", {
              current: relocation.location.current + 1,
              total: relocation.location.total,
            })}
          <span className="ml-2 font-medium text-text">{pct}%</span>
        </span>
      </div>

      {/* panels */}
      <aside
        className={cn(
          "absolute top-11 bottom-9 left-0 z-10 w-72 border-r border-border bg-bg-elevated shadow-lift transition-transform duration-200",
          panel === "toc" ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <TocSidebar
          toc={toc}
          currentHref={relocation?.tocItem?.href}
          onNavigate={(href) => {
            void viewRef.current?.goTo(href);
            setPanel(null);
          }}
          bookmarks={bookmarks}
          onJumpBookmark={(cfi) => {
            void viewRef.current?.goTo(cfi);
            setPanel(null);
          }}
          onDeleteBookmark={removeBookmark}
        />
      </aside>
      <aside
        className={cn(
          "absolute top-11 right-0 bottom-9 z-10 w-80 border-l border-border bg-bg-elevated shadow-lift transition-transform duration-200",
          panel === "annotations" ? "translate-x-0" : "translate-x-full",
        )}
      >
        <AnnotationsSidebar
          book={book}
          annotations={annotations}
          onJump={(a) => void viewRef.current?.goTo(a.cfi)}
          onDelete={(a) => void removeAnnotation(a)}
        />
      </aside>
      <aside
        className={cn(
          "absolute top-11 right-0 bottom-9 z-10 w-80 border-l border-border bg-bg-elevated shadow-lift transition-transform duration-200",
          panel === "search" ? "translate-x-0" : "translate-x-full",
        )}
      >
        {/* Mounted only while open so unmount clears the match highlights. */}
        {panel === "search" && (
          <SearchPanel viewRef={viewRef} onJump={(cfi) => void viewRef.current?.goTo(cfi)} />
        )}
      </aside>
      {typographyOpen && (
        <div className="absolute top-12 right-3 z-20">
          <TypographyPanel />
        </div>
      )}
      {displayOpen && (
        <div className="absolute top-12 right-3 z-20">
          <DisplayPopover />
        </div>
      )}
      {popover && (
        <SelectionPopover
          state={popover}
          onHighlight={(color, style) => void upsertAnnotation({ color, style })}
          onSaveNote={(note) =>
            void upsertAnnotation({
              color: popover.color ?? "yellow",
              style: popover.style ?? "highlight",
              note,
            })
          }
          onDelete={
            popover.annotationId !== undefined
              ? () => {
                  const a = annotations.find((x) => x.id === popover.annotationId);
                  if (a) void removeAnnotation(a);
                }
              : undefined
          }
          onClose={() => {
            viewRef.current?.deselect();
            setPopover(null);
          }}
        />
      )}
    </div>
  );
}

function IconBtn({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "transition-fast flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
        active ? "bg-accent/12 text-accent" : "text-text-muted hover:bg-bg-sunken hover:text-text",
      )}
    >
      {children}
    </button>
  );
}
