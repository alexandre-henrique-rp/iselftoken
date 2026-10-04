/**
 * Resolve a backend-served asset path (e.g. `/uploads/image/md/abc.png`)
 * into a fully-qualified URL the browser can load. Backend assets live on
 * the API origin (`VITE_API_URL`), not on the frontend dev/SSR origin.
 *
 * Returns null when input is empty/undefined so callers can short-circuit.
 */
export function resolveAssetUrl(
  path: string | null | undefined,
): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const base = import.meta.env.VITE_API_URL || "";
  if (!base) return path.startsWith("/") ? path : `/${path}`;
  return `${base}${path.startsWith("/") ? "" : "/"}${path}`;
}
