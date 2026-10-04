import { BACKEND_URL } from "~/lib/api-config";

/**
 * GET /sitemap.xml
 * Sitemap dinâmico listando startups elegíveis (campanha OPEN).
 * Crawlers como Googlebot usam para indexar páginas públicas /startup/:slug.
 */
export async function loader() {
  let startups: Array<{ id: number; slug?: string; updatedAt?: string }> = [];

  try {
    const res = await fetch(`${BACKEND_URL}/marketplace/all?pageSize=60`, {
      headers: { accept: "application/json" },
    });
    if (res.ok) {
      const json = await res.json();
      const data = json?.data?.data ?? json?.data ?? [];
      startups = data.map((s: any) => ({
        id: s.id,
        slug: s.slug,
        updatedAt: s.updatedAt,
      }));
    }
  } catch {
    // Falha silenciosa — sitemap vazio é válido
  }

  const today = new Date().toISOString().split("T")[0];

  const urls = startups.map((s) => {
    if (!s.slug) return "";
    const loc = `https://iselftoken.com/startup/${encodeURIComponent(s.slug)}`;
    const lastmod = s.updatedAt
      ? new Date(s.updatedAt).toISOString().split("T")[0]
      : today;
    return `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`;
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://iselftoken.com/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
${urls.join("\n")}
</urlset>`;

  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
