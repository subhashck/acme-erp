import { describe, it, expect, vi, beforeEach } from "vitest";
import { publicRoutes } from "../../server/routes/public";
import { db } from "../../server/db/client";

describe("Public Magazine & Gallery Routes", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  function mockDbSelectSequence(...queryResults: any[][]) {
    let callIdx = 0;
    return vi.spyOn(db, "select").mockImplementation(() => {
      const currentRes = queryResults[callIdx++] ?? [];
      const queryObj: any = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue(currentRes),
        orderBy: vi.fn().mockResolvedValue(currentRes),
        then(resolve: any, reject?: any) {
          return Promise.resolve(currentRes).then(resolve, reject);
        },
      };
      return queryObj;
    });
  }

  it("returns 404 for non-existent magazine issue on /public/magazine/:slug", async () => {
    mockDbSelectSequence([]); // empty issue query

    const res = await publicRoutes.request("/public/magazine/non-existent-slug");
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe("Magazine issue not found or not published");
  });

  it("returns 404 for non-existent magazine issue on /public/magazine/:slug/gallery", async () => {
    mockDbSelectSequence([]); // empty issue query

    const res = await publicRoutes.request("/public/magazine/non-existent-slug/gallery");
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe("Magazine issue not found or not published");
  });

  it("returns 404 HTML for non-existent magazine issue on /public/magazine/view/:slug/gallery", async () => {
    mockDbSelectSequence([]); // empty issue query

    const res = await publicRoutes.request("/public/magazine/view/non-existent-slug/gallery");
    expect(res.status).toBe(404);
    const text = await res.text();
    expect(text).toContain("404 - Magazine Issue Not Found");
  });

  it("returns JSON with media array for published issue on /public/magazine/:slug/gallery", async () => {
    const mockIssue = {
      id: 99,
      issueNo: "ACME-MAG-2026-09",
      title: "Radiology Review",
      slug: "radiology-review-2026-09",
      issueMonth: 9,
      issueYear: 2026,
      status: "published",
      createdAt: new Date(),
    };

    const mockMedia = [
      {
        id: 501,
        fileName: "mri_scan.webp",
        originalName: "Advanced MRI Suite",
        mimeType: "image/webp",
        fileSize: 120000,
        width: 1920,
        height: 1080,
        url: "/api/public/magazine/images/magazine/media/mri_scan.webp",
        thumbnailUrl: "/api/public/magazine/images/magazine/media/mri_scan_thumb.webp",
        tags: ["radiology"],
        createdAt: new Date(),
      },
    ];

    // First select is [issue], second is media array
    mockDbSelectSequence([mockIssue], mockMedia);

    const res = await publicRoutes.request("/public/magazine/radiology-review-2026-09/gallery");
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.issue.title).toBe("Radiology Review");
    expect(data.media).toHaveLength(1);
    expect(data.media[0].originalName).toBe("Advanced MRI Suite");
  });

  it("renders standalone HTML gallery for published issue on /public/magazine/view/:slug/gallery", async () => {
    const mockIssue = {
      id: 100,
      issueNo: "ACME-MAG-2026-10",
      title: "Surgery Digest",
      slug: "surgery-digest-2026-10",
      issueMonth: 10,
      issueYear: 2026,
      status: "published",
      createdAt: new Date(),
    };

    const mockMedia = [
      {
        id: 502,
        fileName: "surgery_suite.webp",
        originalName: "Hybrid Operation Theater",
        mimeType: "image/webp",
        fileSize: 150000,
        width: 1920,
        height: 1080,
        url: "/api/public/magazine/images/magazine/media/surgery_suite.webp",
        thumbnailUrl: "/api/public/magazine/images/magazine/media/surgery_suite_thumb.webp",
        tags: ["surgery"],
        createdAt: new Date(),
      },
    ];

    // First select is [issue], second is media array
    mockDbSelectSequence([mockIssue], mockMedia);

    const res = await publicRoutes.request("/public/magazine/view/surgery-digest-2026-10/gallery");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("Surgery Digest — Photo Gallery");
    expect(html).toContain("Hybrid Operation Theater");
    expect(html).toContain("gallery-masonry-grid");
    expect(html).toContain("id=\"lightboxModal\"");
  });

  it("blocks directory traversal and rejects invalid keys on /public/magazine/images/*", async () => {
    const res = await publicRoutes.request("/public/magazine/images/not-magazine/image.webp");
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid image path");
  });
});
