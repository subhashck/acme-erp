import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchPublishedMagazineIssues } from '../../server/services/magazine-feed.ts';
import { isMagazineServiceKeyValid } from '../../server/routes/magazine-integration.ts';

beforeEach(() => { vi.stubEnv('MAGAZINE_ENABLED', 'true'); });
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
describe('Magazine service boundary', () => {
  it('fails closed when the shared service secret is missing, short or forged', () => {
    expect(isMagazineServiceKeyValid('wrong', 'a'.repeat(40))).toBe(false);
    expect(isMagazineServiceKeyValid('short', 'short')).toBe(false);
    expect(isMagazineServiceKeyValid(undefined, 'a'.repeat(40))).toBe(false);
    expect(isMagazineServiceKeyValid('a'.repeat(40), 'a'.repeat(40))).toBe(true);
  });
  it('does not contact Magazine when disabled even with configured URLs', async () => {
    vi.stubEnv('MAGAZINE_ENABLED', 'false');
    vi.stubEnv('MAGAZINE_INTERNAL_URL', 'http://magazine.internal');
    vi.stubEnv('MAGAZINE_PUBLIC_URL', 'https://hospital.example');
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    expect(await fetchPublishedMagazineIssues()).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('does not contact Magazine when it is unconfigured', async () => {
    vi.stubEnv('MAGAZINE_INTERNAL_URL', '');
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    expect(await fetchPublishedMagazineIssues()).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('keeps ERP usable when the publishing service is unavailable', async () => {
    vi.stubEnv('MAGAZINE_INTERNAL_URL', 'http://magazine.internal');
    vi.stubEnv('MAGAZINE_PUBLIC_URL', 'https://hospital.example');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    expect(await fetchPublishedMagazineIssues()).toEqual([]);
  });
  it('returns external reader, gallery and image URLs from the published feed', async () => {
    vi.stubEnv('MAGAZINE_INTERNAL_URL', 'http://magazine.internal');
    vi.stubEnv('MAGAZINE_PUBLIC_URL', 'https://hospital.example');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json([{
      id: 1, issueNo: 'MAG/26-27/00001', title: 'New issue', slug: 'new-issue',
      issueMonth: 10, issueYear: 2026, publishedAt: null,
      coverImageUrl: '/magazine-api/public/magazine/images/magazine/media/cover.webp',
    }])));
    const [issue] = await fetchPublishedMagazineIssues();
    expect(issue?.readerUrl).toBe('https://hospital.example/magazine/view/new-issue');
    expect(issue?.galleryUrl).toBe('https://hospital.example/magazine/view/new-issue/gallery');
    expect(issue?.coverImageUrl).toContain('https://hospital.example/magazine-api/');
  });
  it('rejects malformed catalog data', async () => {
    vi.stubEnv('MAGAZINE_INTERNAL_URL', 'http://magazine.internal');
    vi.stubEnv('MAGAZINE_PUBLIC_URL', 'https://hospital.example');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json([{ slug: '<script>' }])));
    expect(await fetchPublishedMagazineIssues()).toEqual([]);
  });
});
