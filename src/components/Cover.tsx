import { useMemo } from "react";
import type { Book } from "../ipc";
import { cn, coverUrl } from "../lib/utils";

/** Deterministic pleasant hue per book for the placeholder cover. */
function hue(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360;
  return h;
}

/**
 * Book cover image with a designed fallback (title + author on a tinted
 * gradient) while the real cover is being extracted or when none exists.
 */
export function Cover({ book, className }: { book: Book; className?: string }) {
  const url = coverUrl(book.coverPath);
  const h = useMemo(() => hue(book.contentHash), [book.contentHash]);
  if (url) {
    return (
      <img
        src={url}
        alt=""
        draggable={false}
        loading="lazy"
        className={cn("h-full w-full object-cover", className)}
      />
    );
  }
  return (
    <div
      aria-hidden
      className={cn("flex h-full w-full flex-col justify-between p-3", className)}
      style={{
        background: `linear-gradient(160deg, hsl(${h} 35% 38%), hsl(${(h + 40) % 360} 45% 22%))`,
      }}
    >
      <span className="line-clamp-4 font-serif text-sm leading-snug font-semibold text-white/95">
        {book.title}
      </span>
      <span className="line-clamp-2 text-xs text-white/70">{book.author}</span>
    </div>
  );
}
