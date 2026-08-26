import { jsPDF } from "jspdf";

export interface MagazineSectionForExport {
  id: number;
  title: string;
  subtitle?: string | null;
  authorName?: string | null;
  authorRole?: string | null;
  contentHtml?: string | null;
  sortOrder?: number;
}

export interface MagazineIssueForExport {
  id: number;
  issueNo: string;
  title: string;
  slug: string;
  coverImageUrl?: string | null;
  description?: string | null;
  issueMonth: number;
  issueYear: number;
  sections?: MagazineSectionForExport[];
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function stripHtml(html: string): string {
  return (html || "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<\/p>|<br\s*\/?>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\n\s*\n\s*\n/g, "\n\n")
    .trim();
}

function calculateReadingTime(html: string): number {
  const text = stripHtml(html);
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(wordCount / 200));
}

// Convert image URL to base64 Data URL for jsPDF
async function getBase64ImageFromUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function exportMagazineToPDF(
  issue: MagazineIssueForExport,
  hospitalSettings?: {
    name?: string;
    tagline?: string;
    address?: string;
    phone?: string;
    email?: string;
    emergencyPhone?: string;
    opdPhone?: string;
    website?: string;
  }
): Promise<void> {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 18;
  const contentWidth = pageWidth - marginX * 2;

  const monthName = MONTH_NAMES[issue.issueMonth - 1] || `Month ${issue.issueMonth}`;
  const issueDateStr = `${monthName} ${issue.issueYear}`;
  const hospitalName = hospitalSettings?.name || "ACME Hospital & Healthcare";
  const hospitalTagline = hospitalSettings?.tagline || "Excellence in Medical Care, Research & Healthcare Innovation";
  const hospitalAddress = hospitalSettings?.address || "123 Healthcare Ave, Medical District, Healthcare Campus";
  const emergencyPhone = hospitalSettings?.emergencyPhone || "+91 98765 43211";
  const opdPhone = hospitalSettings?.opdPhone || "+91 98765 43212";
  const email = hospitalSettings?.email || "editorial@acmehospital.com";
  const website = hospitalSettings?.website || "www.acmehospital.com";

  const sections = issue.sections || [];
  const totalMinutes = sections.reduce((acc, s) => acc + calculateReadingTime(s.contentHtml || ""), 0);

  // Helper to add headers and footers to story pages
  const addHeaderAndFooter = (pageNum: number, storyTitle?: string) => {
    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139); // Slate 500
    doc.text(hospitalName.toUpperCase(), marginX, 12);
    doc.setFont("helvetica", "normal");
    doc.text(`${issue.issueNo} • ${issueDateStr}`, pageWidth - marginX, 12, { align: "right" });

    doc.setDrawColor(226, 232, 240); // Slate 200
    doc.setLineWidth(0.3);
    doc.line(marginX, 15, pageWidth - marginX, 15);

    // Footer
    doc.line(marginX, pageHeight - 14, pageWidth - marginX, pageHeight - 14);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // Slate 400
    if (storyTitle) {
      doc.text(storyTitle.length > 40 ? storyTitle.slice(0, 38) + "…" : storyTitle, marginX, pageHeight - 9);
    } else {
      doc.text(hospitalName, marginX, pageHeight - 9);
    }
    doc.setFont("helvetica", "bold");
    doc.text(`— Page ${pageNum} —`, pageWidth - marginX, pageHeight - 9, { align: "right" });
  };

  // -------------------------------------------------------------------------
  // 1. FRONT COVER (Page 1)
  // -------------------------------------------------------------------------
  // Background Header Box
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.rect(0, 0, pageWidth, 85, "F");

  // Accent Line
  doc.setFillColor(56, 189, 248); // Sky 400
  doc.rect(marginX, 16, 28, 2, "F");

  // Brand Name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(56, 189, 248);
  doc.text(hospitalName.toUpperCase(), marginX, 24);

  // Issue Number & Date Pill
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(241, 245, 249);
  doc.text(`${issue.issueNo}  |  ${issueDateStr.toUpperCase()}`, pageWidth - marginX, 24, { align: "right" });

  // Main Issue Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  const titleLines = doc.splitTextToSize(issue.title, contentWidth);
  doc.text(titleLines, marginX, 38);

  // Description / Subtitle
  const descY = 38 + titleLines.length * 9;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(203, 213, 225); // Slate 300
  const descLines = doc.splitTextToSize(issue.description || hospitalTagline, contentWidth);
  doc.text(descLines, marginX, descY);

  // Cover Image
  let coverImgBase64: string | null = null;
  if (issue.coverImageUrl) {
    coverImgBase64 = await getBase64ImageFromUrl(issue.coverImageUrl);
  }

  const coverImgY = 92;
  const coverImgH = 135;

  if (coverImgBase64) {
    try {
      doc.addImage(coverImgBase64, "JPEG", marginX, coverImgY, contentWidth, coverImgH);
      doc.setDrawColor(226, 232, 240);
      doc.rect(marginX, coverImgY, contentWidth, coverImgH);
    } catch {
      // Fallback graphic box
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(marginX, coverImgY, contentWidth, coverImgH, 4, 4, "FD");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(2, 132, 199);
      doc.text("MONTHLY HEALTHCARE EDITION", pageWidth / 2, coverImgY + 68, { align: "center" });
    }
  } else {
    // Elegant graphic emblem placeholder
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(marginX, coverImgY, contentWidth, coverImgH, 4, 4, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(2, 132, 199);
    doc.text("MONTHLY HEALTHCARE EDITION", pageWidth / 2, coverImgY + 60, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`${sections.length} Featured Articles & Clinical Updates`, pageWidth / 2, coverImgY + 70, { align: "center" });
  }

  // Cover Bottom Bar
  const bottomBarY = 242;
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(marginX, bottomBarY, contentWidth, 38, 3, 3, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text("IN THIS EDITION", marginX + 8, bottomBarY + 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`${sections.length} Stories & Features  •  Approx. ${totalMinutes} Minutes Total Read Time`, marginX + 8, bottomBarY + 20);
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Published by ${hospitalName} Editorial Board`, marginX + 8, bottomBarY + 28);

  // -------------------------------------------------------------------------
  // 2. TABLE OF CONTENTS & FOREWORD (Page 2)
  // -------------------------------------------------------------------------
  doc.addPage();
  let currentPageNum = 2;
  addHeaderAndFooter(currentPageNum, "Table of Contents & Foreword");

  let cursorY = 28;

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42);
  doc.text("Editorial Foreword & Contents", marginX, cursorY);
  cursorY += 4;

  doc.setFillColor(2, 132, 199);
  doc.rect(marginX, cursorY, 24, 1.5, "F");
  cursorY += 10;

  // Foreword Card
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(marginX, cursorY, contentWidth, 34, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(2, 132, 199);
  doc.text("FROM THE EDITORIAL DESK", marginX + 6, cursorY + 8);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  const forewordText = `Welcome to the ${issueDateStr} edition of ${issue.title}. Our dedicated clinical teams, consultants, and departments bring you comprehensive updates, clinical advancements, staff spotlights, and preventive healthcare insights for our community.`;
  const fLines = doc.splitTextToSize(forewordText, contentWidth - 12);
  doc.text(fLines, marginX + 6, cursorY + 15);
  cursorY += 42;

  // Table of contents entries
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text("Table of Contents", marginX, cursorY);
  cursorY += 8;

  sections.forEach((sec, idx) => {
    const sNum = String(idx + 1).padStart(2, "0");
    const readMins = calculateReadingTime(sec.contentHtml || "");

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(marginX, cursorY, contentWidth, 16, 2, 2, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(2, 132, 199);
    doc.text(sNum, marginX + 4, cursorY + 10);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    const titleTrunc = sec.title.length > 55 ? sec.title.slice(0, 53) + "…" : sec.title;
    doc.text(titleTrunc, marginX + 16, cursorY + 7);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    const byline = sec.authorName ? `By ${sec.authorName}${sec.authorRole ? ` (${sec.authorRole})` : ""} • ` : "";
    doc.text(`${byline}${readMins} min read`, marginX + 16, cursorY + 12);

    cursorY += 19;
  });

  // -------------------------------------------------------------------------
  // 3. STORY ARTICLES
  // -------------------------------------------------------------------------
  for (let i = 0; i < sections.length; i++) {
    const sec = sections[i];
    doc.addPage();
    currentPageNum++;

    addHeaderAndFooter(currentPageNum, sec.title);
    cursorY = 26;

    // Kicker Pill
    doc.setFillColor(238, 242, 255);
    doc.roundedRect(marginX, cursorY, 40, 6, 1.5, 1.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(79, 70, 229);
    doc.text(`STORY ${String(i + 1).padStart(2, "0")} OF ${String(sections.length).padStart(2, "0")}`, marginX + 3, cursorY + 4.2);

    const readMins = calculateReadingTime(sec.contentHtml || "");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`${readMins} MIN READ`, marginX + 45, cursorY + 4.2);
    cursorY += 10;

    // Section Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42);
    const secTitleLines = doc.splitTextToSize(sec.title, contentWidth);
    doc.text(secTitleLines, marginX, cursorY);
    cursorY += secTitleLines.length * 7;

    // Subtitle
    if (sec.subtitle) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);
      const subLines = doc.splitTextToSize(sec.subtitle, contentWidth);
      doc.text(subLines, marginX, cursorY);
      cursorY += subLines.length * 5.5 + 2;
    }

    // Author byline box
    if (sec.authorName) {
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(marginX, cursorY, contentWidth, 11, 2, 2, "F");

      doc.setFillColor(2, 132, 199);
      doc.circle(marginX + 6, cursorY + 5.5, 3.5, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(255, 255, 255);
      doc.text(sec.authorName.charAt(0).toUpperCase(), marginX + 5, cursorY + 7);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text(sec.authorName, marginX + 13, cursorY + 5.2);

      if (sec.authorRole) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        doc.text(sec.authorRole, marginX + 13, cursorY + 9);
      }
      cursorY += 16;
    } else {
      cursorY += 4;
    }

    // Separator
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(marginX, cursorY, pageWidth - marginX, cursorY);
    cursorY += 8;

    // Body content paragraphs
    const plainText = stripHtml(sec.contentHtml || "Story content is being compiled.");
    const paragraphs = plainText.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

    doc.setFont("times", "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(30, 41, 59); // Slate 800

    for (const para of paragraphs) {
      const pLines = doc.splitTextToSize(para, contentWidth);
      const neededHeight = pLines.length * 5.2 + 4;

      if (cursorY + neededHeight > pageHeight - 20) {
        // Multi-page continuation
        doc.addPage();
        currentPageNum++;
        addHeaderAndFooter(currentPageNum, `${sec.title} (Continued)`);
        cursorY = 24;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(2, 132, 199);
        doc.text(`${sec.title.toUpperCase()} (CONTINUED)`, marginX, cursorY);
        cursorY += 7;

        doc.setFont("times", "normal");
        doc.setFontSize(10.5);
        doc.setTextColor(30, 41, 59);
      }

      doc.text(pLines, marginX, cursorY);
      cursorY += pLines.length * 5.2 + 3.5;
    }
  }

  // -------------------------------------------------------------------------
  // 4. BACK COVER (Final Page)
  // -------------------------------------------------------------------------
  doc.addPage();
  currentPageNum++;

  // Full Page Background
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.rect(0, 0, pageWidth, pageHeight, "F");

  // Center crest
  doc.setFillColor(2, 132, 199);
  doc.circle(pageWidth / 2, 60, 16, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text("ACME", pageWidth / 2, 65, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text(hospitalName, pageWidth / 2, 88, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(148, 163, 184);
  doc.text(hospitalTagline, pageWidth / 2, 96, { align: "center" });

  // Contact Info Box
  const infoBoxY = 120;
  doc.setFillColor(30, 41, 59); // Slate 800
  doc.roundedRect(marginX + 10, infoBoxY, contentWidth - 20, 95, 4, 4, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(56, 189, 248);
  doc.text("HOSPITAL & EDITORIAL CONTACT", marginX + 18, infoBoxY + 14);

  let cY = infoBoxY + 26;
  const addContactRow = (label: string, value: string, isAlert = false) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(148, 163, 184);
    doc.text(label, marginX + 18, cY);

    doc.setFont("helvetica", isAlert ? "bold" : "normal");
    doc.setFontSize(9);
    doc.setTextColor(isAlert ? 248 : 241, isAlert ? 113 : 245, isAlert ? 113 : 249);
    doc.text(value, marginX + 18, cY + 5);
    cY += 13;
  };

  addContactRow("24/7 Emergency Helpline:", emergencyPhone, true);
  addContactRow("OPD Appointments & Enquiries:", opdPhone);
  addContactRow("Editorial & Communications Desk:", email);
  addContactRow("Campus Address:", hospitalAddress);
  addContactRow("Online Web Portal:", website);

  // Bottom Copyright Note
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`© ${new Date().getFullYear()} ${hospitalName}. All rights reserved.`, pageWidth / 2, 260, { align: "center" });
  doc.text(`${issue.issueNo} • Published ${issueDateStr}`, pageWidth / 2, 266, { align: "center" });

  // Download PDF
  const filename = `ACME-Magazine-${issue.slug || issue.id}-${issue.issueNo.replace(/[^a-zA-Z0-9-]/g, "")}.pdf`;
  doc.save(filename);
}
