import type { MetadataRoute } from "next";

/**
 * XML sitemap served at /sitemap.xml (Next.js file convention).
 *
 * Lists the public, indexable marketing routes on the canonical www origin —
 * matching the `Sitemap:` line in public/robots.txt. App routes behind auth
 * (editor, dashboard, resumes) are deliberately excluded.
 */
const BASE_URL = "https://www.vitex.org.nz";

// Fixed date so the sitemap output is deterministic across builds.
const LAST_MODIFIED = "2026-07-08";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${BASE_URL}/`,
      lastModified: LAST_MODIFIED,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${BASE_URL}/pricing`,
      lastModified: LAST_MODIFIED,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/connect`,
      lastModified: LAST_MODIFIED,
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];
}
