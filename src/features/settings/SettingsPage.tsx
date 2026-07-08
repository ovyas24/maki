import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { open as openFolderDialog } from "@tauri-apps/plugin-dialog";
import * as ipc from "../../ipc";
import type { WatchFolder } from "../../ipc";
import { useApp } from "../../store/app";
import { useSettings, type AppTheme } from "../../store/settings";
import { Button } from "../../components/Dialog";
import { Icon } from "../../components/Icon";
import { cn } from "../../lib/utils";

const ACCENTS = ["#d97706", "#dc2626", "#db2777", "#7c3aed", "#2563eb", "#0d9488", "#16a34a"];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      <div className="rounded-xl border border-border bg-bg-elevated p-4">{children}</div>
    </section>
  );
}

export function SettingsPage() {
  const { t } = useTranslation();
  const settings = useSettings();
  const setShortcutsOpen = useApp((s) => s.setShortcutsOpen);
  const [folders, setFolders] = useState<WatchFolder[]>([]);

  useEffect(() => {
    void ipc.listWatchFolders().then(setFolders);
  }, []);

  const addFolder = async () => {
    const dir = await openFolderDialog({ directory: true });
    if (typeof dir === "string") setFolders(await ipc.addWatchFolder(dir));
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-2xl px-8 py-6">
        <h1 className="mb-6 text-xl font-semibold tracking-tight">{t("settings.title")}</h1>

        <Section title={t("settings.appearance")}>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm">{t("settings.appTheme")}</span>
            <div className="flex overflow-hidden rounded-lg border border-border">
              {(["system", "light", "dark"] as AppTheme[]).map((theme) => (
                <button
                  key={theme}
                  onClick={() => settings.set({ appTheme: theme })}
                  className={cn(
                    "transition-fast px-3 py-1.5 text-sm capitalize",
                    settings.appTheme === theme
                      ? "bg-accent/12 font-medium text-accent"
                      : "text-text-muted hover:text-text",
                  )}
                >
                  {t(`settings.theme${theme[0].toUpperCase()}${theme.slice(1)}`)}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm">{t("settings.accent")}</span>
            <div className="flex items-center gap-2">
              {ACCENTS.map((color) => (
                <button
                  key={color}
                  aria-label={color}
                  onClick={() => settings.set({ accent: color })}
                  className={cn(
                    "transition-fast h-6 w-6 rounded-full hover:scale-110",
                    settings.accent === color && "ring-2 ring-text/60 ring-offset-2",
                  )}
                  style={{ background: color }}
                />
              ))}
            </div>
          </div>
        </Section>

        <Section title={t("settings.watchFolders")}>
          <p className="mb-3 text-sm text-text-muted">{t("settings.watchFoldersHint")}</p>
          {folders.length === 0 ? (
            <p className="mb-3 text-sm text-text-muted italic">{t("settings.noWatchFolders")}</p>
          ) : (
            <ul className="mb-3">
              {folders.map((folder) => (
                <li
                  key={folder.id}
                  className="flex items-center justify-between gap-3 border-b border-border py-2 last:border-b-0"
                >
                  <span className="flex min-w-0 items-center gap-2 text-sm">
                    <Icon name="folder" size={15} className="shrink-0 text-text-muted" />
                    <span className="truncate">{folder.path}</span>
                  </span>
                  <Button
                    variant="ghost"
                    onClick={() => void ipc.removeWatchFolder(folder.id).then(setFolders)}
                  >
                    {t("settings.removeFolder")}
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <Button onClick={() => void addFolder()}>
            <Icon name="plus" size={14} />
            {t("settings.addFolder")}
          </Button>
        </Section>

        <Section title={t("settings.shortcuts")}>
          <Button onClick={() => setShortcutsOpen(true)}>
            <Icon name="keyboard" size={15} />
            {t("settings.shortcuts")}
          </Button>
        </Section>

        <Section title={t("settings.about")}>
          <p className="text-sm">{t("settings.aboutBody")}</p>
          <p className="mt-2 text-sm text-text-muted">{t("settings.privacy")}</p>
        </Section>
      </div>
    </div>
  );
}
