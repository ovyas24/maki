import { useTranslation } from "react-i18next";
import { useSettings } from "../../store/settings";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span className="text-sm text-text-muted">{label}</span>
      {children}
    </div>
  );
}

/** Night-reading comfort: brightness (dim), warmth, and auto-scroll speed. */
export function DisplayPopover() {
  const { t } = useTranslation();
  const reader = useSettings((s) => s.reader);
  const setReader = useSettings((s) => s.setReader);

  return (
    <div className="pop-in w-72 rounded-xl border border-border bg-bg-elevated p-4 shadow-lift">
      <Row label={t("reader.brightness")}>
        <input
          type="range"
          min={0.3}
          max={1}
          step={0.05}
          // Higher brightness = less dim overlay.
          value={1 - reader.dimmer}
          onChange={(e) => setReader({ dimmer: 1 - Number(e.target.value) })}
          className="w-40 accent-(--accent)"
        />
      </Row>
      <Row label={t("reader.warmth")}>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={reader.warmth}
          onChange={(e) => setReader({ warmth: Number(e.target.value) })}
          className="w-40 accent-(--accent)"
        />
      </Row>
      {reader.flow === "scrolled" && (
        <Row label={t("reader.autoScrollSpeed")}>
          <input
            type="range"
            min={10}
            max={120}
            step={5}
            value={reader.autoScrollSpeed}
            onChange={(e) => setReader({ autoScrollSpeed: Number(e.target.value) })}
            className="w-40 accent-(--accent)"
          />
        </Row>
      )}
    </div>
  );
}
