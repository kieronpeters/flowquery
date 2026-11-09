/**
 * Vite's `import.meta.glob` is a compile-time macro. The worker tsconfig does
 * not load `vite/client` (it would pull in DOM types that conflict with the
 * Workers runtime), so declare only the shape this project uses.
 */
interface ImportMeta {
  glob<T = unknown>(
    pattern: string | string[],
    options?: { eager?: boolean; query?: string; import?: string },
  ): Record<string, T>
}
