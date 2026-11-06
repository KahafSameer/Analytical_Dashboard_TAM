/**
 * Public base URL for absolute links in metadata (Open Graph images, canonical URLs). Set
 * NEXT_PUBLIC_SITE_URL in production; on Vercel the production domain is used automatically.
 * Link previews (WhatsApp, Facebook, X) only work when this URL is publicly reachable.
 */
export function getSiteUrl(): URL {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) {
    try {
      return new URL(explicit);
    } catch {
      // Fall through to the platform default.
    }
  }
  const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() || process.env.VERCEL_URL?.trim();
  if (vercelHost) return new URL(`https://${vercelHost}`);
  return new URL(`http://localhost:${process.env.PORT ?? 3000}`);
}
