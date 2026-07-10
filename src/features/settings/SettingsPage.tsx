import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { open as openFolderDialog } from "@tauri-apps/plugin-dialog";
import * as ipc from "../../ipc";
import type { WatchFolder } from "../../ipc";
import { useApp } from "../../store/app";
import {
  useSettings,
  type AppTheme,
  type Flow,
  type LibraryView,
  type ReaderFont,
  type ReaderTheme,
  type SortKey,
} from "../../store/settings";
import { Button } from "../../components/Dialog";
import { Icon } from "../../components/Icon";
import { cn } from "../../lib/utils";

const ACCENTS = [
  { color: "#d97706", name: "amber" },
  { color: "#dc2626", name: "red" },
  { color: "#db2777", name: "pink" },
  { color: "#7c3aed", name: "violet" },
  { color: "#2563eb", name: "blue" },
  { color: "#0d9488", name: "teal" },
  { color: "#16a34a", name: "green" },
] as const;

const READER_THEMES: Array<{ key: ReaderTheme; color: string; ink: string }> = [
  { key: "light", color: "#fffdf8", ink: "#26221e" },
  { key: "sepia", color: "#f4ecd8", ink: "#44382c" },
  { key: "gray", color: "#d8d9db", ink: "#292b2f" },
  { key: "dark", color: "#242321", ink: "#dedbd5" },
  { key: "black", color: "#050505", ink: "#e7e7e7" },
];

function SettingsSection({
  icon,
  title,
  description,
  children,
  className,
}: {
  icon: string;
  title: string;
  description: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl border border-border bg-bg-elevated shadow-card",
        className,
      )}
    >
      <header className="flex items-start gap-3 border-b border-border px-5 py-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/12 text-accent">
          <Icon name={icon} size={18} />
        </span>
        <div>
          <h2 className="font-semibold">{title}</h2>
          <p className="mt-0.5 text-xs leading-relaxed text-text-muted">{description}</p>
        </div>
      </header>
      <div className="divide-y divide-border px-5">{children}</div>
    </section>
  );
}

function SettingRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="pr-4">
        <p className="text-sm font-medium">{label}</p>
        {hint && <p className="mt-0.5 text-xs leading-relaxed text-text-muted">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Toggle({
  enabled,
  onChange,
  label,
}: {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={label}
      onClick={() => onChange(!enabled)}
      className={cn(
        "transition-fast relative h-7 w-12 rounded-full border",
        enabled ? "border-accent bg-accent" : "border-border bg-bg-sunken",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-5.5 w-5.5 rounded-full bg-white shadow-sm transition-[left] duration-150",
          enabled ? "left-5.5" : "left-0.5",
        )}
      />
    </button>
  );
}

export function SettingsPage() {
  const { t } = useTranslation();
  const settings = useSettings();
  const setShortcutsOpen = useApp((state) => state.setShortcutsOpen);
  const [folders, setFolders] = useState<WatchFolder[]>([]);
  const [foldersLoading, setFoldersLoading] = useState(true);
  const [folderError, setFolderError] = useState(false);

  useEffect(() => {
    void ipc
      .listWatchFolders()
      .then(setFolders)
      .catch(() => setFolderError(true))
      .finally(() => setFoldersLoading(false));
  }, []);

  const addFolder = async () => {
    const dir = await openFolderDialog({ directory: true });
    if (typeof dir !== "string") return;
    setFoldersLoading(true);
    setFolderError(false);
    try {
      setFolders(await ipc.addWatchFolder(dir));
    } catch {
      setFolderError(true);
    } finally {
      setFoldersLoading(false);
    }
  };

  const removeFolder = async (id: number) => {
    setFoldersLoading(true);
    setFolderError(false);
    try {
      setFolders(await ipc.removeWatchFolder(id));
    } catch {
      setFolderError(true);
    } finally {
      setFoldersLoading(false);
    }
  };

  const appThemes: AppTheme[] = ["system", "light", "dark"];
  const views: LibraryView[] = ["grid", "list"];
  const fonts: ReaderFont[] = ["serif", "sans", "mono", "system"];
  const flows: Flow[] = ["paginated", "scrolled"];
  const sortKeys: SortKey[] = ["recentlyOpened", "recentlyAdded", "title", "author", "progress"];

  return (
    <div className="settings-canvas h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl px-8 py-7">
        <header className="mb-7 flex items-end justify-between gap-6">
          <div>
            <p className="mb-1 text-xs font-semibold tracking-wider text-accent uppercase">
              {t("settings.preferences")}
            </p>
            <h1 className="text-xl font-semibold tracking-tight">{t("settings.title")}</h1>
            <p className="mt-1 max-w-xl text-sm text-text-muted">{t("settings.description")}</p>
          </div>
          <span className="hidden items-center gap-2 rounded-full border border-border bg-bg-elevated px-3 py-1.5 text-xs text-text-muted shadow-card sm:flex">
            <Icon name="shield" size={14} className="text-accent" />
            {t("settings.localOnly")}
          </span>
        </header>

        <div className="grid items-start gap-5 lg:grid-cols-2">
          <SettingsSection
            icon="palette"
            title={t("settings.appearance")}
            description={t("settings.appearanceHint")}
          >
            <SettingRow label={t("settings.appTheme")} hint={t("settings.appThemeHint")}>
              <div className="flex overflow-hidden rounded-xl border border-border bg-bg-sunken p-1">
                {appThemes.map((theme) => (
                  <button
                    key={theme}
                    onClick={() => settings.set({ appTheme: theme })}
                    className={cn(
                      "transition-fast rounded-lg px-3 py-1.5 text-xs font-medium",
                      settings.appTheme === theme
                        ? "bg-bg-elevated text-text shadow-sm"
                        : "text-text-muted hover:text-text",
                    )}
                  >
                    {t(`settings.theme${theme[0].toUpperCase()}${theme.slice(1)}`)}
                  </button>
                ))}
              </div>
            </SettingRow>
            <SettingRow label={t("settings.accent")} hint={t("settings.accentHint")}>
              <div className="flex flex-wrap items-center gap-2">
                {ACCENTS.map(({ color, name }) => (
                  <button
                    key={color}
                    aria-label={t(`settings.accents.${name}`)}
                    aria-pressed={settings.accent === color}
                    title={t(`settings.accents.${name}`)}
                    onClick={() => settings.set({ accent: color })}
                    className={cn(
                      "transition-fast h-7 w-7 rounded-full border-2 border-bg-elevated shadow-sm hover:scale-110",
                      settings.accent === color &&
                        "ring-2 ring-text/60 ring-offset-1 ring-offset-bg-elevated",
                    )}
                    style={{ background: color }}
                  />
                ))}
              </div>
            </SettingRow>
          </SettingsSection>

          <SettingsSection
            icon="library"
            title={t("settings.library")}
            description={t("settings.libraryHint")}
          >
            <SettingRow label={t("settings.defaultView")} hint={t("settings.defaultViewHint")}>
              <div className="flex overflow-hidden rounded-xl border border-border bg-bg-sunken p-1">
                {views.map((view) => (
                  <button
                    key={view}
                    onClick={() => settings.set({ view })}
                    className={cn(
                      "transition-fast flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium",
                      settings.view === view
                        ? "bg-bg-elevated text-text shadow-sm"
                        : "text-text-muted hover:text-text",
                    )}
                  >
                    <Icon name={view} size={14} />
                    {t(`library.view.${view}`)}
                  </button>
                ))}
              </div>
            </SettingRow>
            <SettingRow label={t("settings.defaultSort")}>
              <select
                value={settings.sort}
                onChange={(event) => settings.set({ sort: event.target.value as SortKey })}
                className="h-9 min-w-44 rounded-lg border border-border bg-bg px-3 text-sm outline-none focus:border-accent"
              >
                {sortKeys.map((key) => (
                  <option key={key} value={key}>
                    {t(`library.sort.${key}`)}
                  </option>
                ))}
              </select>
            </SettingRow>
          </SettingsSection>

          <SettingsSection
            icon="book"
            title={t("settings.reading")}
            description={t("settings.readingHint")}
            className="lg:col-span-2"
          >
            <div className="grid lg:grid-cols-2 lg:divide-x lg:divide-border">
              <div className="lg:pr-5">
                <SettingRow label={t("settings.readerFont")}>
                  <div className="flex flex-wrap justify-end gap-1 rounded-xl border border-border bg-bg-sunken p-1">
                    {fonts.map((font) => (
                      <button
                        key={font}
                        onClick={() => settings.setReader({ font })}
                        className={cn(
                          "transition-fast rounded-lg px-2.5 py-1.5 text-xs font-medium",
                          settings.reader.font === font
                            ? "bg-bg-elevated text-text shadow-sm"
                            : "text-text-muted hover:text-text",
                          font === "serif" && "font-serif",
                          font === "mono" && "font-mono",
                        )}
                      >
                        {t(`reader.font${font[0].toUpperCase()}${font.slice(1)}`)}
                      </button>
                    ))}
                  </div>
                </SettingRow>
                <SettingRow label={t("settings.readerLayout")}>
                  <div className="flex overflow-hidden rounded-xl border border-border bg-bg-sunken p-1">
                    {flows.map((flow) => (
                      <button
                        key={flow}
                        onClick={() => settings.setReader({ flow })}
                        className={cn(
                          "transition-fast rounded-lg px-3 py-1.5 text-xs font-medium",
                          settings.reader.flow === flow
                            ? "bg-bg-elevated text-text shadow-sm"
                            : "text-text-muted hover:text-text",
                        )}
                      >
                        {t(`reader.${flow}`)}
                      </button>
                    ))}
                  </div>
                </SettingRow>
              </div>
              <div className="lg:pl-5">
                <SettingRow label={t("settings.readerTheme")}>
                  <div className="flex items-center gap-2">
                    {READER_THEMES.map(({ key, color, ink }) => (
                      <button
                        key={key}
                        aria-label={t(`reader.themes.${key}`)}
                        aria-pressed={settings.reader.theme === key}
                        title={t(`reader.themes.${key}`)}
                        onClick={() => settings.setReader({ theme: key })}
                        className={cn(
                          "transition-fast flex h-8 w-8 items-center justify-center rounded-lg border border-border shadow-sm hover:-translate-y-0.5",
                          settings.reader.theme === key &&
                            "ring-2 ring-accent ring-offset-1 ring-offset-bg-elevated",
                        )}
                        style={{ background: color, color: ink }}
                      >
                        <span className="font-serif text-sm font-bold">Aa</span>
                      </button>
                    ))}
                  </div>
                </SettingRow>
                <SettingRow
                  label={t("settings.pageAnimation")}
                  hint={t("settings.pageAnimationHint")}
                >
                  <Toggle
                    enabled={settings.reader.pageAnimation}
                    onChange={(pageAnimation) => settings.setReader({ pageAnimation })}
                    label={t("settings.pageAnimation")}
                  />
                </SettingRow>
              </div>
            </div>
          </SettingsSection>

          <SettingsSection
            icon="folder"
            title={t("settings.watchFolders")}
            description={t("settings.watchFoldersHint")}
          >
            <div className="py-4">
              {folderError && (
                <p role="alert" className="mb-3 flex items-center gap-2 text-xs text-red-500">
                  <Icon name="warning" size={14} />
                  {t("settings.watchFoldersError")}
                </p>
              )}
              {foldersLoading && folders.length === 0 ? (
                <p className="text-sm text-text-muted">{t("common.loading")}</p>
              ) : folders.length === 0 ? (
                <div className="mb-4 rounded-xl border border-dashed border-border bg-bg-sunken/60 p-4 text-center">
                  <Icon name="folder" size={20} className="mx-auto mb-2 text-text-muted" />
                  <p className="text-sm font-medium">{t("settings.noWatchFolders")}</p>
                  <p className="mt-1 text-xs text-text-muted">{t("settings.noWatchFoldersHint")}</p>
                </div>
              ) : (
                <ul className="mb-4 space-y-1">
                  {folders.map((folder) => (
                    <li
                      key={folder.id}
                      className="group flex items-center justify-between gap-3 rounded-lg px-2 py-2 hover:bg-bg-sunken"
                    >
                      <span className="flex min-w-0 items-center gap-2 text-sm">
                        <Icon name="folder" size={15} className="shrink-0 text-accent" />
                        <span className="truncate" title={folder.path}>
                          {folder.path}
                        </span>
                      </span>
                      <button
                        disabled={foldersLoading}
                        aria-label={t("settings.removeFolder")}
                        onClick={() => void removeFolder(folder.id)}
                        className="transition-fast rounded-md p-1.5 text-text-muted opacity-0 group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-500 disabled:opacity-40"
                      >
                        <Icon name="trash" size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <Button disabled={foldersLoading} onClick={() => void addFolder()}>
                <Icon name="plus" size={14} />
                {t("settings.addFolder")}
              </Button>
            </div>
          </SettingsSection>

          <SettingsSection
            icon="keyboard"
            title={t("settings.help")}
            description={t("settings.helpHint")}
          >
            <div className="py-4">
              <button
                onClick={() => setShortcutsOpen(true)}
                className="transition-fast flex w-full items-center gap-3 rounded-xl border border-border bg-bg px-3 py-3 text-left hover:border-accent/40 hover:shadow-card"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-bg-sunken text-text-muted">
                  <Icon name="keyboard" size={17} />
                </span>
                <span>
                  <span className="block text-sm font-medium">{t("settings.shortcuts")}</span>
                  <span className="block text-xs text-text-muted">
                    {t("settings.shortcutsHint")}
                  </span>
                </span>
                <Icon name="chevronRight" size={16} className="ml-auto text-text-muted" />
              </button>
              <div className="mt-4 flex items-start gap-3 px-1">
                <Icon name="shield" size={17} className="mt-0.5 shrink-0 text-accent" />
                <div>
                  <p className="text-sm font-medium">{t("settings.aboutBody")}</p>
                  <p className="mt-1 text-xs leading-relaxed text-text-muted">
                    {t("settings.privacy")}
                  </p>
                </div>
              </div>
            </div>
          </SettingsSection>
        </div>
      </div>
    </div>
  );
}
