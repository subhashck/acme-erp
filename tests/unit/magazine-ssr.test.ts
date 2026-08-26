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
});
