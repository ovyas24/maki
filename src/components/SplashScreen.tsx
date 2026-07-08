import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

/**
 * Cold-start launch screen: an animated Maki ribbon mark over the app
 * background, shown until boot (settings + library) finishes, then fades out.
 * Held for a short minimum so it reads as intentional rather than a flash.
 * Unmounts entirely once gone so it never intercepts input.
 */
export function SplashScreen({ done }: { done: boolean }) {
  const { t } = useTranslation();
  const [minElapsed, setMinElapsed] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setMinElapsed(true), 550);
    return () => clearTimeout(id);
  }, []);

  const leaving = done && minElapsed;

  useEffect(() => {
    if (!leaving) return;
    const id = setTimeout(() => setGone(true), 400); // match fade-out duration
    return () => clearTimeout(id);
  }, [leaving]);

  if (gone) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-bg"
      style={{
        animation: leaving ? "splash-out 400ms var(--ease-out) forwards" : undefined,
      }}
      aria-hidden
    >
      <svg width="88" height="88" viewBox="0 0 200 200" className="splash-logo" fill="none">
        <defs>
          <linearGradient id="splash-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f59e0b" />
            <stop offset="1" stopColor="#b45309" />
          </linearGradient>
        </defs>
        {/* bookmark ribbon (matches the app icon) */}
        <path
          d="M64 34 h72 c 8 0 14 6 14 14 v 118 l -50 -30 -50 30 v -118 c 0 -8 6 -14 14 -14 z"
          fill="url(#splash-grad)"
        />
      </svg>
      <div className="splash-word mt-5 text-xl font-semibold tracking-tight">{t("app.name")}</div>
      <div
        className="splash-word mt-1 font-serif text-sm text-text-muted"
        style={{ animationDelay: "80ms" }}
      >
        栞
      </div>
    </div>
  );
}
