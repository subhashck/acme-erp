import { z } from 'zod';

const issueSchema = z.object({
  id: z.number(), issueNo: z.string(), title: z.string(), slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  coverImageUrl: z.string().nullable().optional(), description: z.string().nullable().optional(),
  issueMonth: z.number().int().min(1).max(12), issueYear: z.number().int(), publishedAt: z.string().nullable(),
});

export function isMagazineEnabled() {
  return process.env.MAGAZINE_ENABLED === 'true';
}

export async function fetchPublishedMagazineIssues() {
  if (!isMagazineEnabled()) return [];
  const internalUrl = process.env.MAGAZINE_INTERNAL_URL;
  const publicUrl = process.env.MAGAZINE_PUBLIC_URL;
  if (!internalUrl || !publicUrl) return [];
  try {
    const response = await fetch(new URL('/magazine-api/public/magazine', internalUrl), {
      signal: AbortSignal.timeout(3000), redirect: 'error',
    });
    if (!response.ok) return [];
    const issues = z.array(issueSchema).max(500).parse(await response.json());
    const origin = new URL(publicUrl);
    if (!['http:', 'https:'].includes(origin.protocol)) return [];
    return issues.map(issue => ({ ...issue,
      coverImageUrl: issue.coverImageUrl ? new URL(issue.coverImageUrl, origin).href : null,
      readerUrl: new URL(`/magazine/view/${issue.slug}`, origin).href,
      galleryUrl: new URL(`/magazine/view/${issue.slug}/gallery`, origin).href,
    }));
  } catch {
    // A publishing outage must not prevent ERP sign-in or dashboard rendering.
    return [];
  }
}
