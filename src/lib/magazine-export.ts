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
  editorialTitle?: string | null;
  editorialHtml?: string | null;
  issueMonth: number;
  issueYear: number;
  sections?: MagazineSectionForExport[];
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export type ContentBlock =
  | { type: "heading"; level: number; text: string }
  | { type: "paragraph"; text: string }
  | { type: "callout"; variant: "info" | "success" | "warning" | "danger" | "note"; text: string }
  | { type: "blockquote"; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "code"; text: string }
  | { type: "divider" };

function cleanInlineText(html: string): string {
  return (html || "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseHtmlToBlocks(html: string): ContentBlock[] {
  if (!html) return [];

  // Strip page-break elements first
  const sanitized = html
    .replace(/<div[^>]*class="[^"]*page-break-divider[^"]*"[\s\S]*?<\/div>/gi, "")
    .replace(/<div[^>]*data-type="page-break"[\s\S]*?<\/div>/gi, "")
    .replace(/<div[^>]*data-page-break="true"[\s\S]*?<\/div>/gi, "")
    .replace(/<span[^>]*class="[^"]*page-break-pill[^"]*"[\s\S]*?<\/span>/gi, "")
    .replace(/<hr[^>]*class="[^"]*page-break[^"]*"[^>]*\/?>/gi, "")
    .replace(/<hr[^>]*data-page-break="true"[^>]*\/?>/gi, "");

  if (typeof DOMParser !== "undefined") {
    try {
      const parser = new DOMParser();
      const docTree = parser.parseFromString(`<body>${sanitized}</body>`, "text/html");
      const blocks: ContentBlock[] = [];

      const processNode = (node: Node) => {
        if (node.nodeType === 1) { // ELEMENT_NODE
          const el = node as HTMLElement;
          const tag = el.tagName.toLowerCase();

          if (/^h[1-6]$/.test(tag)) {
            const level = parseInt(tag[1], 10);
            const text = cleanInlineText(el.textContent || "");
            if (text) blocks.push({ type: "heading", level, text });
            return;
          }

          if (el.classList.contains("callout-box") || el.hasAttribute("data-callout-type") || el.className.includes("callout")) {
            let variant: "info" | "success" | "warning" | "danger" | "note" = "info";
            const typeAttr = el.getAttribute("data-callout-type");
            if (typeAttr === "success" || el.classList.contains("callout-success")) variant = "success";
            else if (typeAttr === "warning" || el.classList.contains("callout-warning")) variant = "warning";
            else if (typeAttr === "danger" || el.classList.contains("callout-danger")) variant = "danger";
            else if (typeAttr === "note" || el.classList.contains("callout-note")) variant = "note";

            const text = cleanInlineText(el.textContent || "");
            if (text) blocks.push({ type: "callout", variant, text });
            return;
          }

          if (tag === "blockquote") {
            const text = cleanInlineText(el.textContent || "");
            if (text) blocks.push({ type: "blockquote", text });
            return;
          }

          if (tag === "ul" || tag === "ol") {
            const isOrdered = tag === "ol";
            const items = Array.from(el.querySelectorAll("li"))
              .map((li) => cleanInlineText(li.textContent || ""))
              .filter(Boolean);
            if (items.length > 0) blocks.push({ type: "list", ordered: isOrdered, items });
            return;
          }

          if (tag === "table") {
            const headerCells = Array.from(el.querySelectorAll("thead th, tr:first-child th, tr:first-child td"));
            const headers = headerCells.map((c) => cleanInlineText(c.textContent || ""));
            const rows: string[][] = [];
            const trs = Array.from(el.querySelectorAll("tbody tr, tr"));
            const startIdx = headerCells.length > 0 && el.querySelector("thead") ? 0 : 1;
            for (let i = startIdx; i < trs.length; i++) {
              const cells = Array.from(trs[i].querySelectorAll("td, th")).map((c) => cleanInlineText(c.textContent || ""));
              if (cells.some((c) => c.length > 0)) rows.push(cells);
            }
            if (headers.length > 0 || rows.length > 0) {
              blocks.push({ type: "table", headers, rows });
            }
            return;
          }

          if (tag === "pre") {
            const text = el.textContent?.trim() || "";
            if (text) blocks.push({ type: "code", text });
            return;
          }

          if (tag === "hr") {
            blocks.push({ type: "divider" });
            return;
          }

          if (tag === "p") {
            const text = cleanInlineText(el.textContent || "");
            if (text) blocks.push({ type: "paragraph", text });
            return;
          }

          // Recursively process nested divs/sections
          Array.from(el.childNodes).forEach(processNode);
        } else if (node.nodeType === 3) { // TEXT_NODE
          const text = (node.textContent || "").trim();
          if (text) {
            blocks.push({ type: "paragraph", text: cleanInlineText(text) });
          }
        }
      };

      Array.from(docTree.body.childNodes).forEach(processNode);
      if (blocks.length > 0) return blocks;
    } catch {
      // Fall through to regex parser
    }
  }

  // Fallback regex block tokenizer for node environments
  const blocks: ContentBlock[] = [];
  const blockRegex = /<(h[1-6]|div|blockquote|ul|ol|table|pre|p|hr)([^>]*)>([\s\S]*?)<\/\1>|<hr\s*\/?>/gi;
  let match: RegExpExecArray | null;

  while ((match = blockRegex.exec(sanitized)) !== null) {
    const tag = (match[1] || "hr").toLowerCase();
    const attrs = match[2] || "";
    const inner = match[3] || "";

    if (/^h[1-6]$/.test(tag)) {
      const level = parseInt(tag[1], 10);
      const text = cleanInlineText(inner);
      if (text) blocks.push({ type: "heading", level, text });
    } else if (tag === "div" && (attrs.includes("callout") || attrs.includes("data-callout-type"))) {
      let variant: "info" | "success" | "warning" | "danger" | "note" = "info";
      if (attrs.includes("success")) variant = "success";
      else if (attrs.includes("warning")) variant = "warning";
      else if (attrs.includes("danger")) variant = "danger";
      else if (attrs.includes("note")) variant = "note";
      const text = cleanInlineText(inner);
      if (text) blocks.push({ type: "callout", variant, text });
    } else if (tag === "blockquote") {
      const text = cleanInlineText(inner);
      if (text) blocks.push({ type: "blockquote", text });
    } else if (tag === "ul" || tag === "ol") {
      const isOrdered = tag === "ol";
      const items: string[] = [];
      const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
      let liMatch: RegExpExecArray | null;
      while ((liMatch = liRegex.exec(inner)) !== null) {
        const itemText = cleanInlineText(liMatch[1]);
        if (itemText) items.push(itemText);
      }
      if (items.length > 0) blocks.push({ type: "list", ordered: isOrdered, items });
    } else if (tag === "table") {
      const headers: string[] = [];
      const rows: string[][] = [];
      const thRegex = /<th[^>]*>([\s\S]*?)<\/th>/gi;
      let thMatch: RegExpExecArray | null;
      while ((thMatch = thRegex.exec(inner)) !== null) {
        headers.push(cleanInlineText(thMatch[1]));
      }
      const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
      let trMatch: RegExpExecArray | null;
      while ((trMatch = trRegex.exec(inner)) !== null) {
        const cells: string[] = [];
        const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
        let tdMatch: RegExpExecArray | null;
        while ((tdMatch = tdRegex.exec(trMatch[1])) !== null) {
          cells.push(cleanInlineText(tdMatch[1]));
        }
        if (cells.length > 0) rows.push(cells);
      }
      if (headers.length > 0 || rows.length > 0) blocks.push({ type: "table", headers, rows });
    } else if (tag === "pre") {
      const text = cleanInlineText(inner);
      if (text) blocks.push({ type: "code", text });
    } else if (tag === "hr") {
      blocks.push({ type: "divider" });
    } else if (tag === "p") {
      const text = cleanInlineText(inner);
      if (text) blocks.push({ type: "paragraph", text });
    }
  }

  if (blocks.length === 0) {
    const paragraphs = stripHtml(sanitized).split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
    for (const p of paragraphs) {
      blocks.push({ type: "paragraph", text: p });
    }
  }

  return blocks;
}

function stripHtml(html: string): string {
  return (html || "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<div[^>]*class="[^"]*page-break-divider[^"]*"[\s\S]*?<\/div>/gi, "")
    .replace(/<div[^>]*data-type="page-break"[\s\S]*?<\/div>/gi, "")
    .replace(/<div[^>]*data-page-break="true"[\s\S]*?<\/div>/gi, "")
    .replace(/<span[^>]*class="[^"]*page-break-pill[^"]*"[\s\S]*?<\/span>/gi, "")
    .replace(/<hr[^>]*class="[^"]*page-break[^"]*"[^>]*\/?>/gi, "")
    .replace(/<hr[^>]*data-page-break="true"[^>]*\/?>/gi, "")
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
  const forewordTitle = (issue.editorialTitle || "FROM THE EDITORIAL DESK").toUpperCase();
  const forewordRaw = issue.editorialHtml ? stripHtml(issue.editorialHtml) : "";
  const forewordText = forewordRaw || `Welcome to the ${issueDateStr} edition of ${issue.title}. Our dedicated clinical teams, consultants, and departments bring you comprehensive updates, clinical advancements, staff spotlights, and preventive healthcare insights for our community.`;
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const fLines = doc.splitTextToSize(forewordText, contentWidth - 14);
  const cardHeight = Math.max(36, 18 + (fLines.length * 5.0));

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(marginX, cursorY, contentWidth, cardHeight, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(2, 132, 199);
  doc.text(forewordTitle, marginX + 7, cursorY + 8.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(51, 65, 85);
  doc.text(fLines, marginX + 7, cursorY + 16);
  cursorY += cardHeight + 8;

  // Table of contents entries
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13.5);
  doc.setTextColor(15, 23, 42);
  doc.text("Table of Contents", marginX, cursorY);
  cursorY += 8;

  sections.forEach((sec, idx) => {
    const sNum = String(idx + 1).padStart(2, "0");
    const readMins = calculateReadingTime(sec.contentHtml || "");

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(marginX, cursorY, contentWidth, 18, 2, 2, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(2, 132, 199);
    doc.text(sNum, marginX + 4.5, cursorY + 11.5);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    const titleTrunc = sec.title.length > 55 ? sec.title.slice(0, 53) + "…" : sec.title;
    doc.text(titleTrunc, marginX + 17, cursorY + 7.5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    const byline = sec.authorName ? `By ${sec.authorName}${sec.authorRole ? ` (${sec.authorRole})` : ""} • ` : "";
    doc.text(`${byline}${readMins} min read`, marginX + 17, cursorY + 13.5);

    cursorY += 21;
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
    doc.roundedRect(marginX, cursorY, 42, 6.5, 1.5, 1.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(79, 70, 229);
    doc.text(`STORY ${String(i + 1).padStart(2, "0")} OF ${String(sections.length).padStart(2, "0")}`, marginX + 3, cursorY + 4.5);

    const readMins = calculateReadingTime(sec.contentHtml || "");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`${readMins} MIN READ`, marginX + 47, cursorY + 4.5);
    cursorY += 11;

    // Section Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42);
    const secTitleLines = doc.splitTextToSize(sec.title, contentWidth);
    doc.text(secTitleLines, marginX, cursorY);
    cursorY += secTitleLines.length * 7.6;

    // Subtitle
    if (sec.subtitle) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(71, 85, 105);
      const subLines = doc.splitTextToSize(sec.subtitle, contentWidth);
      doc.text(subLines, marginX, cursorY);
      cursorY += subLines.length * 6.0 + 3;
    }

    // Author byline box
    if (sec.authorName) {
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(marginX, cursorY, contentWidth, 12, 2, 2, "F");

      doc.setFillColor(2, 132, 199);
      doc.circle(marginX + 6.5, cursorY + 6, 3.8, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text(sec.authorName.charAt(0).toUpperCase(), marginX + 5.2, cursorY + 7.5);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      doc.text(sec.authorName, marginX + 14, cursorY + 5.5);

      if (sec.authorRole) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text(sec.authorRole, marginX + 14, cursorY + 9.8);
      }
      cursorY += 18;
    } else {
      cursorY += 4;
    }

    // Separator
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(marginX, cursorY, pageWidth - marginX, cursorY);
    cursorY += 9;

    // Structured Body Content Blocks
    const blocks = parseHtmlToBlocks(sec.contentHtml || "<p>Story content is being compiled.</p>");

    // Space management & multi-page continuation helper
    const ensureSpace = (neededHeight: number) => {
      if (cursorY + neededHeight > pageHeight - 20) {
        doc.addPage();
        currentPageNum++;
        addHeaderAndFooter(currentPageNum, `${sec.title} (Continued)`);
        cursorY = 24;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(2, 132, 199);
        doc.text(`${sec.title.toUpperCase()} (CONTINUED)`, marginX, cursorY);
        cursorY += 8;
      }
    };

    for (const block of blocks) {
      if (block.type === "heading") {
        const isH12 = block.level <= 2;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(isH12 ? 14.5 : 12.5);
        doc.setTextColor(15, 23, 42);
        const hLines = doc.splitTextToSize(block.text, contentWidth);
        const needed = (isH12 ? 14 : 9) + hLines.length * (isH12 ? 6.5 : 5.6);
        ensureSpace(needed);
        cursorY += isH12 ? 5 : 3;
        doc.text(hLines, marginX, cursorY);
        cursorY += hLines.length * (isH12 ? 6.5 : 5.6);
        if (isH12) {
          doc.setDrawColor(2, 132, 199);
          doc.setLineWidth(0.6);
          doc.line(marginX, cursorY, marginX + 30, cursorY);
          cursorY += 6;
        } else {
          cursorY += 4;
        }
      } else if (block.type === "callout") {
        let bg = [240, 249, 255]; // info default
        let border = [2, 132, 199];
        let textCol = [15, 23, 42];

        if (block.variant === "success") {
          bg = [240, 253, 244];
          border = [34, 197, 94];
          textCol = [20, 83, 45];
        } else if (block.variant === "warning") {
          bg = [254, 252, 232];
          border = [234, 179, 8];
          textCol = [113, 63, 18];
        } else if (block.variant === "danger") {
          bg = [254, 242, 242];
          border = [239, 68, 68];
          textCol = [153, 27, 27];
        } else if (block.variant === "note") {
          bg = [250, 245, 255];
          border = [168, 85, 247];
          textCol = [88, 28, 135];
        }

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10.5);
        const cLines = doc.splitTextToSize(block.text, contentWidth - 16);
        const boxH = Math.max(16, 10 + cLines.length * 5.4);
        ensureSpace(boxH + 5);

        doc.setFillColor(bg[0], bg[1], bg[2]);
        doc.roundedRect(marginX, cursorY, contentWidth, boxH, 1.5, 1.5, "F");

        doc.setFillColor(border[0], border[1], border[2]);
        doc.rect(marginX, cursorY, 3.5, boxH, "F");

        doc.setTextColor(textCol[0], textCol[1], textCol[2]);
        doc.text(cLines, marginX + 9, cursorY + 7);
        cursorY += boxH + 5;
      } else if (block.type === "blockquote") {
        doc.setFont("times", "italic");
        doc.setFontSize(11.5);
        const qLines = doc.splitTextToSize(`“${block.text}”`, contentWidth - 16);
        const boxH = Math.max(16, 10 + qLines.length * 5.8);
        ensureSpace(boxH + 5);

        doc.setFillColor(248, 250, 252);
        doc.rect(marginX, cursorY, contentWidth, boxH, "F");

        doc.setFillColor(2, 132, 199);
        doc.rect(marginX, cursorY, 3.5, boxH, "F");

        doc.setTextColor(51, 65, 85);
        doc.text(qLines, marginX + 9, cursorY + 7);
        cursorY += boxH + 5;
      } else if (block.type === "list") {
        for (let lIdx = 0; lIdx < block.items.length; lIdx++) {
          const item = block.items[lIdx];
          const prefix = block.ordered ? `${lIdx + 1}.` : "•";
          doc.setFont("times", "normal");
          doc.setFontSize(11.5);
          doc.setTextColor(30, 41, 59);
          const iLines = doc.splitTextToSize(item, contentWidth - 12);
          ensureSpace(iLines.length * 5.8 + 3);

          doc.setFont("helvetica", "bold");
          doc.setFontSize(11.5);
          doc.setTextColor(2, 132, 199);
          doc.text(prefix, marginX + 2, cursorY + 4.5);

          doc.setFont("times", "normal");
          doc.setTextColor(30, 41, 59);
          doc.text(iLines, marginX + 8, cursorY + 4.5);
          cursorY += iLines.length * 5.8 + 2.5;
        }
        cursorY += 3;
      } else if (block.type === "table") {
        const colCount = Math.max(block.headers.length, ...block.rows.map((r) => r.length), 1);
        const colW = contentWidth / colCount;
        const cellPad = 3;

        if (block.headers.length > 0) {
          ensureSpace(14);
          doc.setFillColor(241, 245, 249);
          doc.setDrawColor(203, 213, 225);
          doc.rect(marginX, cursorY, contentWidth, 9.5, "FD");
          doc.setFont("helvetica", "bold");
          doc.setFontSize(9.5);
          doc.setTextColor(15, 23, 42);

          for (let c = 0; c < colCount; c++) {
            const hText = block.headers[c] || "";
            const lines = doc.splitTextToSize(hText, colW - cellPad * 2);
            doc.text(lines[0] || "", marginX + c * colW + cellPad, cursorY + 6.5);
          }
          cursorY += 9.5;
        }

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(51, 65, 85);

        for (let r = 0; r < block.rows.length; r++) {
          const row = block.rows[r];
          ensureSpace(10);
          if (r % 2 === 1) {
            doc.setFillColor(248, 250, 252);
            doc.rect(marginX, cursorY, contentWidth, 8.5, "F");
          }
          doc.setDrawColor(226, 232, 240);
          doc.setLineWidth(0.2);
          doc.line(marginX, cursorY + 8.5, pageWidth - marginX, cursorY + 8.5);

          for (let c = 0; c < colCount; c++) {
            const cellText = row[c] || "";
            const lines = doc.splitTextToSize(cellText, colW - cellPad * 2);
            doc.text(lines[0] || "", marginX + c * colW + cellPad, cursorY + 6);
          }
          cursorY += 8.5;
        }
        cursorY += 5;
      } else if (block.type === "code") {
        doc.setFont("courier", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(15, 23, 42);
        const codeLines = doc.splitTextToSize(block.text, contentWidth - 10);
        const boxH = Math.max(14, 8 + codeLines.length * 4.8);
        ensureSpace(boxH + 5);

        doc.setFillColor(241, 245, 249);
        doc.setDrawColor(203, 213, 225);
        doc.roundedRect(marginX, cursorY, contentWidth, boxH, 1.5, 1.5, "FD");

        doc.text(codeLines, marginX + 5, cursorY + 6);
        cursorY += boxH + 5;
      } else if (block.type === "divider") {
        ensureSpace(7);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.4);
        doc.line(marginX, cursorY + 3, pageWidth - marginX, cursorY + 3);
        cursorY += 7;
      } else {
        // Regular paragraph
        doc.setFont("times", "normal");
        doc.setFontSize(11.5);
        doc.setTextColor(30, 41, 59);
        const pLines = doc.splitTextToSize(block.text, contentWidth);
        ensureSpace(pLines.length * 5.8 + 4.5);
        doc.text(pLines, marginX, cursorY);
        cursorY += pLines.length * 5.8 + 4.5;
      }
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
