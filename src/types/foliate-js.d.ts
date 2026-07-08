// Minimal typings for the parts of foliate-js Maki uses.
declare module "foliate-js/view.js" {
  export interface TocItem {
    label: string;
    href?: string;
    subitems?: TocItem[] | null;
  }

  /** EPUB metadata values can be plain strings, language maps, or contributor objects. */
  export type MetadataValue =
    string | { name?: string | Record<string, string> } | Record<string, string>;

  export interface FoliateBook {
    metadata?: {
      title?: MetadataValue;
      author?: MetadataValue | MetadataValue[];
      language?: string | string[];
      description?: string;
    };
    toc?: TocItem[] | null;
    dir?: string;
    rendition?: { layout?: string };
    getCover?: () => Promise<Blob | null>;
    destroy?: () => void;
  }

  export interface Location {
    current: number;
    next: number;
    total: number;
  }

  export interface Relocation {
    cfi: string;
    fraction: number;
    location?: Location;
    time?: { section: number; total: number };
    tocItem?: TocItem | null;
    pageItem?: { label: string } | null;
  }

  export interface Renderer extends HTMLElement {
    setStyles?: (css: string) => void;
    goTo: (resolved: unknown) => Promise<void>;
    next: (distance?: number) => Promise<void>;
    prev: (distance?: number) => Promise<void>;
    getContents: () => Array<{ doc: Document; index: number; overlayer?: unknown }>;
    scrolled?: boolean;
  }

  export interface FoliateView extends HTMLElement {
    open: (book: File | FoliateBook) => Promise<void>;
    close: () => void;
    init: (options: { lastLocation?: string | null; showTextStart?: boolean }) => Promise<void>;
    goTo: (target: string | number) => Promise<unknown>;
    goToFraction: (fraction: number) => Promise<void>;
    goLeft: () => Promise<void>;
    goRight: () => Promise<void>;
    next: (distance?: number) => Promise<void>;
    prev: (distance?: number) => Promise<void>;
    getCFI: (index: number, range?: Range) => string;
    resolveCFI: (cfi: string) => { index: number; anchor: unknown };
    addAnnotation: (annotation: { value: string; color?: string }) => Promise<unknown>;
    deleteAnnotation: (annotation: { value: string }) => Promise<unknown>;
    deselect: () => void;
    book: FoliateBook;
    renderer: Renderer;
    lastLocation?: Relocation;
    language: { canonical?: string };
  }

  export function makeBook(file: File | string): Promise<FoliateBook>;
}

declare module "foliate-js/overlayer.js" {
  export class Overlayer {
    static highlight(range: Range, options?: { color?: string }): SVGElement;
    static underline(range: Range, options?: { color?: string }): SVGElement;
    static squiggly(range: Range, options?: { color?: string }): SVGElement;
    static outline(range: Range, options?: { color?: string }): SVGElement;
  }
}
