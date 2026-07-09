import { useTranslation } from "react-i18next";
import { useApp } from "../store/app";
import { Dialog, DialogTitle } from "./Dialog";

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="rounded-md border border-border bg-bg-sunken px-1.5 py-0.5 font-mono text-xs">
      {children}
    </kbd>
  );
}

const GROUPS: Array<{ group: string; items: Array<{ keys: string[]; label: string }> }> = [
  {
    group: "library",
    items: [
      { keys: ["/"], label: "search" },
      { keys: ["Ctrl", "O"], label: "importBooks" },
      { keys: ["Ctrl", "\\"], label: "toggleView" },
    ],
  },
  {
    group: "reader",
    items: [
      { keys: ["→", "PgDn", "Space"], label: "nextPage" },
      { keys: ["←", "PgUp"], label: "prevPage" },
      { keys: ["[", "]"], label: "chapterNav" },
      { keys: ["Home", "End"], label: "startEnd" },
      { keys: ["F"], label: "searchInBook" },
      { keys: ["B"], label: "bookmark" },
      { keys: ["T"], label: "toggleToc" },
      { keys: ["A"], label: "toggleAnnotations" },
      { keys: ["F11"], label: "fullscreen" },
      { keys: ["Esc"], label: "backToLibrary" },
    ],
  },
];

export function ShortcutsOverlay() {
  const { t } = useTranslation();
  const { shortcutsOpen, setShortcutsOpen } = useApp();
  return (
    <Dialog open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} wide>
      <DialogTitle>{t("shortcuts.title")}</DialogTitle>
      <div className="grid grid-cols-2 gap-x-10">
        {GROUPS.map(({ group, items }) => (
          <div key={group}>
            <h3 className="mt-3 mb-2 text-xs font-semibold tracking-wide text-text-muted uppercase">
              {t(`shortcuts.${group}`)}
            </h3>
            {items.map(({ keys, label }) => (
              <div
                key={label}
                className="flex items-center justify-between border-b border-border py-2 last:border-b-0"
              >
                <span className="text-sm">{t(`shortcuts.${label}`)}</span>
                <span className="flex gap-1">
                  {keys.map((k) => (
                    <Kbd key={k}>{k}</Kbd>
                  ))}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-text-muted">
        <Kbd>?</Kbd> — {t("shortcuts.showHelp")}
      </p>
    </Dialog>
  );
}
