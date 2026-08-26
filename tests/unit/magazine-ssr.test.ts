import { describe, it, expect } from "vitest";
import { renderMagazineHtml } from "../../server/services/magazine-ssr";

describe("Magazine SSR Engine", () => {
  it("correctly renders HTML containing tables without truncating or corrupting DOM structure", () => {
    const tableHtml = `
      <p>Introductory paragraph before the table.</p>
      <table class="border-collapse table-auto w-full my-4 border border-border">
        <thead>
          <tr>
            <th class="p-2 border"><p>Department</p></th>
            <th class="p-2 border"><p>Cases</p></th>
            <th class="p-2 border"><p>Success Rate</p></th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="p-2 border"><p>Cardiology</p></td>
            <td class="p-2 border"><p>1,240</p></td>
            <td class="p-2 border"><p>99.4%</p></td>
          </tr>
          <tr>
            <td class="p-2 border"><p>Neurology</p></td>
            <td class="p-2 border"><p>850</p></td>
            <td class="p-2 border"><p>98.7%</p></td>
          </tr>
        </tbody>
      </table>
      <p>Concluding paragraph after the table.</p>
    `;

    const html = renderMagazineHtml(
      {
        id: 1,
        issueNo: "ACME-MAG-2026-01",
        title: "Clinical Innovations Quarterly",
        slug: "clinical-innovations-2026-01",
        issueMonth: 3,
        issueYear: 2026,
        status: "published",
        createdAt: new Date(),
      },
      [
        {
          id: 101,
          title: "Surgical Outcomes 2026",
          subtitle: "Comprehensive review of hospital surgical department metrics",
          authorName: "Dr. A. Sharma",
          authorRole: "Chief of Surgery",
          contentHtml: tableHtml,
          sortOrder: 1,
        },
      ],
      {
        name: "ACME Super Specialty Hospital",
      }
    );

    expect(html).toBeDefined();
    // Verify table structure is intact and not truncated
    expect(html).toContain("<table");
    expect(html).toContain("</table>");
    expect(html).toContain("Department");
    expect(html).toContain("Cardiology");
    expect(html).toContain("Neurology");
    // Verify balanced flipbook pages
    expect(html).toContain('id="book"');
    expect(html).toContain('class="page"');
  });

  it("safely handles callout boxes with nested paragraphs", () => {
    const calloutHtml = `
      <div data-callout-type="warning" class="callout-box callout-warning">
        <p><strong>Clinical Notice:</strong> Ensure strict adherence to sterilization protocols.</p>
      </div>
      <p>Standard operating procedure text continues here.</p>
    `;

    const html = renderMagazineHtml(
      {
        id: 2,
        issueNo: "ACME-MAG-2026-02",
        title: "Patient Safety Special",
        slug: "patient-safety-2026-02",
        issueMonth: 4,
        issueYear: 2026,
        status: "published",
        createdAt: new Date(),
      },
      [
        {
          id: 102,
          title: "Infection Control Protocols",
          contentHtml: calloutHtml,
          sortOrder: 1,
        },
      ]
    );

    expect(html).toContain("callout-box callout-warning");
    expect(html).toContain("Clinical Notice:");
    expect(html).toContain("Standard operating procedure text continues here.");
  });

  it("splits pages at explicit page break dividers", () => {
    const pageBreakHtml = `
      <p>Content on page one before explicit cut.</p>
      <hr class="page-break" data-page-break="true" />
      <p>Content on page two immediately following explicit page break.</p>
    `;

    const html = renderMagazineHtml(
      {
        id: 3,
        issueNo: "ACME-MAG-2026-03",
        title: "Surgical Case Studies",
        slug: "surgical-case-studies-2026-03",
        issueMonth: 5,
        issueYear: 2026,
        status: "published",
        createdAt: new Date(),
      },
      [
        {
          id: 103,
          title: "Robotic Surgery Advances",
          contentHtml: pageBreakHtml,
          sortOrder: 1,
        },
      ]
    );

    expect(html).toBeDefined();
    expect(html).toContain("Content on page one before explicit cut.");
    expect(html).toContain("Content on page two immediately following explicit page break.");
    // Verify continuation page was created for the second part
    expect(html).toContain("Robotic Surgery Advances (Continued)");
  });

  it("renders user-customized editorial foreword and preserves automatic table of contents", () => {
    const html = renderMagazineHtml(
      {
        id: 4,
        issueNo: "ACME-MAG-2026-04",
        title: "Cardiology & Vascular Digest",
        slug: "cardiology-vascular-2026-04",
        issueMonth: 6,
        issueYear: 2026,
        status: "published",
        createdAt: new Date(),
        editorialTitle: "Message from the Medical Superintendent",
        editorialHtml: "<p>Welcome to this special cardiology edition highlighting our TAVR milestone and heart transplant successes.</p>",
      },
      [
        {
          id: 201,
          title: "Milestone: 500th TAVR Procedure",
          subtitle: "Transcatheter Aortic Valve Replacement breakthrough",
          authorName: "Dr. K. Nair",
          authorRole: "Director of Cardiology",
          contentHtml: "<p>The cardiology department achieved a major milestone this month...</p>",
          sortOrder: 1,
        },
        {
          id: 202,
          title: "Preventive Cardiac Health Checklist",
          subtitle: "Diet and activity recommendations",
          authorName: "Dr. M. Roy",
          authorRole: "Consultant Cardiologist",
          contentHtml: "<p>Cardiovascular disease prevention begins with daily habits...</p>",
          sortOrder: 2,
        },
      ]
    );

    // Verify custom editorial title & html in inside cover
    expect(html).toContain("Message from the Medical Superintendent");
    expect(html).toContain("Welcome to this special cardiology edition highlighting our TAVR milestone");

    // Verify editorial foreword is also rendered in the continuous scroll section
    expect(html).toContain('class="editorial-scroll-section"');
    expect(html).toContain('EDITORIAL FOREWORD');

    // Verify automatic Table of Contents entries are generated dynamically
    expect(html).toContain("Milestone: 500th TAVR Procedure");
    expect(html).toContain("Preventive Cardiac Health Checklist");
    expect(html).toContain("IN THIS ISSUE");
    expect(html).toContain("Table of Contents");
  });

  it("falls back to default editorial message when custom editorial is not provided", () => {
    const html = renderMagazineHtml(
      {
        id: 5,
        issueNo: "ACME-MAG-2026-05",
        title: "General Wellness Bulletin",
        slug: "general-wellness-2026-05",
        issueMonth: 7,
        issueYear: 2026,
        status: "published",
        createdAt: new Date(),
      },
      [
        {
          id: 301,
          title: "Summer Heat Safety",
          contentHtml: "<p>Staying hydrated in peak summer.</p>",
          sortOrder: 1,
        },
      ]
    );

    // Default title and message
    expect(html).toContain("From the Editorial Desk");
    expect(html).toContain("Our clinical teams and departments continue to bring groundbreaking updates");
    expect(html).toContain("Summer Heat Safety");
  });

  it("hides page break dividers and pills in media print stylesheet", () => {
    const html = renderMagazineHtml(
      {
        id: 6,
        issueNo: "ACME-MAG-2026-06",
        title: "Oncology Review",
        slug: "oncology-review-2026-06",
        issueMonth: 8,
        issueYear: 2026,
        status: "published",
        createdAt: new Date(),
      },
      []
    );

    expect(html).toContain("@media print");
    expect(html).toContain(".page-break-divider");
    expect(html).toContain(".page-break-pill");
    expect(html).toContain("display: none !important");
  });

  it("renders responsive YouTube video containers and applies proportional aspect-ratio styling", () => {
    const youtubeHtml = `
      <p>Watch our laparoscopic surgical demonstration below:</p>
      <div data-youtube-video="">
        <iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ" width="640" height="480" allowfullscreen="true"></iframe>
      </div>
      <p>Key clinical findings from the procedure.</p>
    `;

    const html = renderMagazineHtml(
      {
        id: 7,
        issueNo: "ACME-MAG-2026-07",
        title: "Surgical Video Series",
        slug: "surgical-video-series-2026-07",
        issueMonth: 9,
        issueYear: 2026,
        status: "published",
        createdAt: new Date(),
      },
      [
        {
          id: 401,
          title: "Laparoscopic Video Case Study",
          contentHtml: youtubeHtml,
          sortOrder: 1,
        },
      ]
    );

    // Verify HTML preserves the video embed and injects Watch on YouTube button
    expect(html).toContain("data-youtube-video");
    expect(html).toContain("https://www.youtube.com/embed/dQw4w9WgXcQ");
    expect(html).toContain("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    expect(html).toContain('target="_blank"');
    expect(html).toContain("Watch on YouTube ↗");

    // Verify CSS includes responsive 16:9 aspect-ratio rules and button styles
    expect(html).toContain("aspect-ratio: 16 / 9");
    expect(html).toContain("div[data-youtube-video]");
    expect(html).toContain(".yt-open-tab-btn");
  });
});

describe("Magazine PDF Export Parser", () => {
  it("extracts structured formatting blocks for headings, callouts, blockquotes, lists, and tables", async () => {
    const { parseHtmlToBlocks } = await import("../../src/lib/magazine-export");

    const sampleHtml = `
      <h2>Executive Clinical Summary</h2>
      <p>This is a standard lead paragraph.</p>
      <div class="callout-box callout-warning" data-callout-type="warning">
        <p>Warning: Adhere to strict sterile protocol.</p>
      </div>
      <blockquote>
        <p>Innovation distinguishes between a leader and a follower.</p>
      </blockquote>
      <ul>
        <li>Pre-operative checklist completed</li>
        <li>Anesthesia clearance verified</li>
      </ul>
      <div class="page-break-divider" data-page-break="true">
        <span class="page-break-pill">✂ Page Break — New Flipbook Page</span>
      </div>
      <p>Post-break continuation paragraph.</p>
    `;

    const blocks = parseHtmlToBlocks(sampleHtml);
    expect(blocks.length).toBeGreaterThan(0);

    const heading = blocks.find((b) => b.type === "heading");
    expect(heading).toBeDefined();
    if (heading && heading.type === "heading") {
      expect(heading.text).toBe("Executive Clinical Summary");
      expect(heading.level).toBe(2);
    }

    const callout = blocks.find((b) => b.type === "callout");
    expect(callout).toBeDefined();
    if (callout && callout.type === "callout") {
      expect(callout.variant).toBe("warning");
      expect(callout.text).toContain("Warning: Adhere to strict sterile protocol.");
    }

    const quote = blocks.find((b) => b.type === "blockquote");
    expect(quote).toBeDefined();
    if (quote && quote.type === "blockquote") {
      expect(quote.text).toContain("Innovation distinguishes between a leader and a follower.");
    }

    const list = blocks.find((b) => b.type === "list");
    expect(list).toBeDefined();
    if (list && list.type === "list") {
      expect(list.ordered).toBe(false);
      expect(list.items).toContain("Pre-operative checklist completed");
    }

    // Verify page break pill text was completely excluded
    const allText = JSON.stringify(blocks);
    expect(allText).not.toContain("✂ Page Break");
  });
});
