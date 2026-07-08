// Bundled reading fonts, resolved to absolute URLs so they load inside the
// sandboxed section iframes (relative URLs don't resolve against blob docs).
import literataUrl from "@fontsource-variable/literata/files/literata-latin-wght-normal.woff2?url";
import interUrl from "@fontsource-variable/inter/files/inter-latin-wght-normal.woff2?url";
import jetbrainsUrl from "@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2?url";
import type { FontFace } from "./themes";

const abs = (url: string) => new URL(url, window.location.href).href;

export const READER_FONTS: Record<"serif" | "sans" | "mono", FontFace> = {
  serif: { family: "Literata Variable", url: abs(literataUrl) },
  sans: { family: "Inter Variable", url: abs(interUrl) },
  mono: { family: "JetBrains Mono Variable", url: abs(jetbrainsUrl) },
};
