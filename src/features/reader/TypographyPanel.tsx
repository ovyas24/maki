import { useTranslation } from "react-i18next";
import {
  useSettings,
  type ReaderFont,
  type ReaderTheme,
  type Flow,
  type Columns,
} from "../../store/settings";
import { READER_THEMES } from "./themes";
import { cn } from "../../lib/utils";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span className="text-sm text-text-muted">{label}</span>
      {children}
    </div>
  );
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: T; label: React.ReactNode; title?: string }>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex overflow-hidden rounded-lg border border-border">
      {options.map((opt) => (
        <button
          key={opt.value}
          title={opt.title}
          onClick={() => onChange(opt.value)}
          className={cn(
            "transition-fast px-3 py-1.5 text-sm",
            value === opt.value
              ? "bg-accent/12 font-medium text-accent"
              : "bg-bg-elevated text-text-muted hover:text-text",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function TypographyPanel() {
  const { t } = useTranslation();
  const reader = useSettings((s) => s.reader);
  const setReader = useSettings((s) => s.setReader);

  const fonts: Array<{ value: ReaderFont; label: React.ReactNode; title: string }> = [
    { value: "serif", label: <span className="font-serif">Aa</span>, title: t("reader.fontSerif") },
    { value: "sans", label: <span className="font-sans">Aa</span>, title: t("reader.fontSans") },
    { value: "mono", label: <span className="font-mono">Aa</span>, title: t("reader.fontMono") },
    { value: "system", label: "Aa", title: t("reader.fontSystem") },
  ];

  return (
    <div className="pop-in w-80 rounded-xl border border-border bg-bg-elevated p-4 shadow-lift">
      <Row label={t("reader.font")}>
        <Segmented options={fonts} value={reader.font} onChange={(font) => setReader({ font })} />
      </Row>
      <Row label={t("reader.fontSize")}>
        <input
          type="range"
          min={12}
          max={32}
          step={1}
          value={reader.fontSize}
          onChange={(e) => setReader({ fontSize: Number(e.target.value) })}
          className="w-40 accent-(--accent)"
        />
      </Row>
      <Row label={t("reader.lineHeight")}>
        <input
          type="range"
          min={1.2}
          max={2.2}
          step={0.1}
          value={reader.lineHeight}
          onChange={(e) => setReader({ lineHeight: Number(e.target.value) })}
          className="w-40 accent-(--accent)"
        />
      </Row>
      <Row label={t("reader.margins")}>
        <input
          type="range"
          min={0}
          max={16}
          step={1}
          value={reader.margin}
          onChange={(e) => setReader({ margin: Number(e.target.value) })}
          className="w-40 accent-(--accent)"
        />
      </Row>
      <Row label={t("reader.lineWidth")}>
        <input
          type="range"
          min={480}
          max={960}
          step={20}
          value={reader.lineWidth}
          onChange={(e) => setReader({ lineWidth: Number(e.target.value) })}
          className="w-40 accent-(--accent)"
        />
      </Row>
      <Row label={t("reader.justify")}>
        <input
          type="checkbox"
          checked={reader.justify}
          onChange={(e) => setReader({ justify: e.target.checked })}
          className="h-4 w-4 accent-(--accent)"
        />
      </Row>
      <Row label={t("reader.hyphenate")}>
        <input
          type="checkbox"
          checked={reader.hyphenate}
          onChange={(e) => setReader({ hyphenate: e.target.checked })}
          className="h-4 w-4 accent-(--accent)"
        />
      </Row>
      <Row label={t("reader.layout")}>
        <Segmented<Flow>
          options={[
            { value: "paginated", label: t("reader.paginated") },
            { value: "scrolled", label: t("reader.scrolled") },
          ]}
          value={reader.flow}
          onChange={(flow) => setReader({ flow })}
        />
      </Row>
      {reader.flow === "paginated" && (
        <>
          <Row label={t("reader.columns")}>
            <Segmented<Columns>
              options={[
                { value: "auto", label: t("reader.columnsAuto") },
                { value: "single", label: "1" },
                { value: "double", label: "2" },
              ]}
              value={reader.columns}
              onChange={(columns) => setReader({ columns })}
            />
          </Row>
          <Row label={t("reader.pageAnimation")}>
            <input
              type="checkbox"
              checked={reader.pageAnimation}
              onChange={(e) => setReader({ pageAnimation: e.target.checked })}
              className="h-4 w-4 accent-(--accent)"
            />
          </Row>
        </>
      )}
      <div className="mt-2 border-t border-border pt-3">
        <div className="mb-2 text-sm text-text-muted">{t("reader.theme")}</div>
        <div className="flex gap-2">
          {(Object.keys(READER_THEMES) as ReaderTheme[]).map((key) => (
            <button
              key={key}
              title={t(`reader.themes.${key}`)}
              onClick={() => setReader({ theme: key })}
              className={cn(
                "transition-fast flex h-10 w-12 items-center justify-center rounded-lg border text-sm font-medium",
                reader.theme === key ? "border-accent ring-2 ring-accent/40" : "border-border",
              )}
              style={{ background: READER_THEMES[key].bg, color: READER_THEMES[key].fg }}
            >
              Aa
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
