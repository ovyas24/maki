import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLibrary } from "../store/library";
import { Icon } from "./Icon";

export function ImportToast() {
  const { t } = useTranslation();
  const summary = useLibrary((state) => state.importSummary);
  const dismiss = useLibrary((state) => state.dismissImportSummary);

  useEffect(() => {
    if (!summary) return;
    const timeout = window.setTimeout(dismiss, summary.failed > 0 ? 7000 : 4500);
    return () => window.clearTimeout(timeout);
  }, [summary, dismiss]);

  if (!summary) return null;
  const details = [
    summary.duplicate > 0 && t("library.importFeedback.duplicates", { count: summary.duplicate }),
    summary.unsupported > 0 &&
      t("library.importFeedback.unsupported", { count: summary.unsupported }),
    summary.failed > 0 && t("library.importFeedback.failed", { count: summary.failed }),
  ].filter((detail): detail is string => Boolean(detail));
  const successful = summary.imported > 0;

  return (
    <div
      role={summary.failed > 0 ? "alert" : "status"}
      aria-live={summary.failed > 0 ? "assertive" : "polite"}
      className="pop-in fixed right-5 bottom-5 z-50 flex w-[min(24rem,calc(100vw-2.5rem))] items-start gap-3 rounded-xl border border-border bg-bg-elevated p-3.5 shadow-lift"
    >
      <span
        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          summary.failed > 0 && !successful
            ? "bg-red-500/12 text-red-500"
            : "bg-accent/12 text-accent"
        }`}
      >
        <Icon name={summary.failed > 0 && !successful ? "warning" : "check"} size={16} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-medium">
          {successful
            ? t("library.importFeedback.imported", { count: summary.imported })
            : t("library.importFeedback.none")}
        </p>
        {details.length > 0 && (
          <p className="mt-0.5 text-xs leading-relaxed text-text-muted">{details.join(" · ")}</p>
        )}
      </div>
      <button
        onClick={dismiss}
        aria-label={t("library.importFeedback.dismiss")}
        className="transition-fast rounded-md p-1 text-text-muted hover:bg-bg-sunken hover:text-text"
      >
        <Icon name="x" size={14} />
      </button>
    </div>
  );
}
