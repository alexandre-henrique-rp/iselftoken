/**
 * Setup global para testes Vitest — estende expect com matchers do jest-dom.
 */
import "@testing-library/jest-dom";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Garante unmount entre testes para evitar DOM compartilhado.
afterEach(() => {
  cleanup();
});

// Polyfill para Radix Slider/Accordion que dependem de ResizeObserver em jsdom.
if (typeof globalThis.ResizeObserver === "undefined") {
  class ResizeObserverPolyfill {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  (globalThis as unknown as { ResizeObserver: typeof ResizeObserverPolyfill }).ResizeObserver =
    ResizeObserverPolyfill;
}

if (typeof globalThis.matchMedia === "undefined") {
  (globalThis as unknown as { matchMedia: (q: string) => MediaQueryList }).matchMedia = (
    query: string,
  ) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    });
}

if (typeof globalThis.IntersectionObserver === "undefined") {
  class IntersectionObserverPolyfill {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
    root: Element | null = null;
    rootMargin = "";
    thresholds: ReadonlyArray<number> = [];
  }
  (globalThis as unknown as { IntersectionObserver: typeof IntersectionObserverPolyfill }).IntersectionObserver =
    IntersectionObserverPolyfill;
}
