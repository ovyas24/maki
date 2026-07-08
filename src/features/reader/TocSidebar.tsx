import type { TocItem } from "foliate-js/view.js";
import { cn } from "../../lib/utils";

function TocBranch({
  items,
  depth,
  currentHref,
  onNavigate,
}: {
  items: TocItem[];
  depth: number;
  currentHref: string | undefined;
  onNavigate: (href: string) => void;
}) {
  return (
    <ul>
      {items.map((item, i) => (
        <li key={`${depth}-${i}`}>
          <button
            onClick={() => item.href && onNavigate(item.href)}
            disabled={!item.href}
            className={cn(
              "transition-fast w-full truncate rounded-md px-2.5 py-1.5 text-left text-sm",
              item.href === currentHref
                ? "bg-accent/12 font-medium text-accent"
                : "text-text-muted hover:bg-bg-sunken hover:text-text",
            )}
            style={{ paddingLeft: `${10 + depth * 14}px` }}
          >
            {item.label}
          </button>
          {item.subitems?.length ? (
            <TocBranch
              items={item.subitems}
              depth={depth + 1}
              currentHref={currentHref}
              onNavigate={onNavigate}
            />
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export function TocSidebar({
  toc,
  currentHref,
  onNavigate,
}: {
  toc: TocItem[];
  currentHref: string | undefined;
  onNavigate: (href: string) => void;
}) {
  return (
    <div className="h-full overflow-y-auto p-2">
      <TocBranch items={toc} depth={0} currentHref={currentHref} onNavigate={onNavigate} />
    </div>
  );
}
