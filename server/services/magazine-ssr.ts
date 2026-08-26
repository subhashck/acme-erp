export interface MagazineIssueData {
  id: number;
  issueNo: string;
  title: string;
  slug: string;
  coverImageUrl?: string | null;
  description?: string | null;
  issueMonth: number;
  issueYear: number;
  status: string;
  publishedAt?: Date | string | null;
  createdAt: Date | string;
}

export interface MagazineSectionData {
  id: number;
  title: string;
  subtitle?: string | null;
  authorName?: string | null;
  authorRole?: string | null;
  contentHtml: string;
  sortOrder: number;
}

export interface HospitalSettingsData {
  name?: string | null;
  tagline?: string | null;
  logoUrl?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  website?: string | null;
  emergencyPhone?: string | null;
  opdPhone?: string | null;
  editorialDivision?: string | null;
  copyrightText?: string | null;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").trim();
}

function calculateReadingTime(html: string): number {
  const text = stripHtml(html);
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(wordCount / 200));
}

/**
 * Intelligent Layout Paginator for StPageFlip
 * Splits article HTML blocks into balanced pages without vertical overflow
 */
function splitHtmlIntoMagazinePages(html: string): string[] {
  if (!html || !html.trim()) {
    return ['<p class="empty-note">Story content is being compiled.</p>'];
  }

  const blockRegex = /(<(?:p|blockquote|h[1-6]|ul|ol|figure|div|pre|table|hr)[^>]*>[\s\S]*?<\/(?:p|blockquote|h[1-6]|ul|ol|figure|div|pre|table|hr)>|<(?:img|hr)[^>]*\/?>)/gi;
  let rawBlocks: string[] = html.match(blockRegex) || [];
  if (rawBlocks.length === 0) {
    const rawParas = html.split(/<\/p>|<br\s*\/?>\s*<br\s*\/?>/i).filter(b => b.trim());
    rawBlocks = rawParas.map(p => (p.trim().startsWith("<") ? p : `<p>${p}</p>`));
  }

  const blocks: string[] = [];
  for (const block of rawBlocks) {
    const textLen = stripHtml(block).length;
    if (block.toLowerCase().startsWith("<p") && textLen > 400) {
      const innerText = block.replace(/^<p[^>]*>/i, "").replace(/<\/p>$/i, "");
      const sentences = innerText.split(/(?<=[.!?])\s+/);
      let curr = "";
      for (const sent of sentences) {
        if ((curr + " " + sent).length > 250 && curr.length > 0) {
          blocks.push(`<p>${curr.trim()}</p>`);
          curr = sent;
        } else {
          curr = curr ? `${curr} ${sent}` : sent;
        }
      }
      if (curr) blocks.push(`<p>${curr.trim()}</p>`);
    } else {
      blocks.push(block);
    }
  }

  const pages: string[] = [];
  let currentPageBlocks: string[] = [];
  let currentWeight = 0;

  // First page capacity is ~420 units (due to article header), continuation pages ~680 units
  const getCapacity = (pageIdx: number) => (pageIdx === 0 ? 420 : 680);

  for (const block of blocks) {
    let weight = stripHtml(block).length;
    if (/<img/i.test(block)) weight = 420;
    if (/<table/i.test(block)) weight = 450;
    if (/<blockquote/i.test(block)) weight = Math.round(weight * 1.4) + 60;
    if (/<h[1-6]/i.test(block)) weight += 60;
    if (/<ul|<ol/i.test(block)) weight = Math.round(weight * 1.2) + 50;

    const maxCap = getCapacity(pages.length);

    if (currentPageBlocks.length > 0 && currentWeight + weight > maxCap) {
      pages.push(currentPageBlocks.join("\n"));
      currentPageBlocks = [block];
      currentWeight = weight;
    } else {
      currentPageBlocks.push(block);
      currentWeight += weight;
    }
  }

  if (currentPageBlocks.length > 0) {
    pages.push(currentPageBlocks.join("\n"));
  }

  return pages.length > 0 ? pages : ['<p class="empty-note">Story content is being compiled.</p>'];
}

export function renderMagazineHtml(
  issue: MagazineIssueData,
  sections: MagazineSectionData[],
  hospital?: HospitalSettingsData | null
): string {
  const monthName = MONTH_NAMES[issue.issueMonth - 1] || `Month ${issue.issueMonth}`;
  const issueDateStr = `${monthName} ${issue.issueYear}`;
  const hospitalName = hospital?.name || "ACME Hospital & Healthcare";
  const hospitalTagline = hospital?.tagline || "Excellence in Medical Care, Research & Healthcare Innovation";
  const hospitalAddress = hospital?.address || "123 Healthcare Ave, Medical District, Healthcare Campus";
  const hospitalPhone = hospital?.phone || "+91 98765 43210";
  const hospitalEmail = hospital?.email || "editorial@acmehospital.com";
  const hospitalWebsite = hospital?.website || "www.acmehospital.com";
  const hospitalEmergency = hospital?.emergencyPhone || "+91 98765 43211";
  const hospitalOpd = hospital?.opdPhone || "+91 98765 43212";
  const hospitalDivision = hospital?.editorialDivision || "ACME Healthcare Communications & Editorial Division";
  const hospitalCopyright = hospital?.copyrightText || "ACME Monthly Electronic Magazine. All rights reserved.";

  // Calculate total reading time
  const totalMinutes = sections.reduce((acc, sec) => acc + calculateReadingTime(sec.contentHtml || ""), 0);

  // Pre-paginate all sections for multi-page StPageFlip layout
  const sectionPaging: {
    section: MagazineSectionData;
    pages: string[];
    startFlipIndex: number; // 0-indexed in flipPages
    startPageNum: number;   // 1-indexed display
  }[] = [];

  let nextFlipIndex = 2; // Index 0: Cover (P.1), Index 1: Inside Cover (P.2)

  sections.forEach((sec) => {
    const secPages = splitHtmlIntoMagazinePages(sec.contentHtml || "");
    sectionPaging.push({
      section: sec,
      pages: secPages,
      startFlipIndex: nextFlipIndex,
      startPageNum: nextFlipIndex + 1,
    });
    nextFlipIndex += secPages.length;
  });

  // Prepare table of contents for scroll mode and drawer
  const tocItemsHtml = sectionPaging.map((item, idx) => {
    const sec = item.section;
    const anchor = `section-${sec.id}`;
    const readMins = calculateReadingTime(sec.contentHtml || "");
    return `
      <a href="#${anchor}" class="toc-card group" data-section="${anchor}" onclick="handleTocClick('${anchor}', ${item.startFlipIndex}, event)">
        <div class="toc-card-num">${String(idx + 1).padStart(2, "0")}</div>
        <div class="toc-card-body">
          <h3 class="toc-card-title">${escapeHtml(sec.title)}</h3>
          ${sec.subtitle ? `<p class="toc-card-sub">${escapeHtml(sec.subtitle)}</p>` : ""}
          <div class="toc-card-meta">
            ${sec.authorName ? `<span class="toc-card-author">By ${escapeHtml(sec.authorName)}</span>` : ""}
            <span class="toc-card-time">${readMins} min read &bull; P.${item.startPageNum}</span>
          </div>
        </div>
        <div class="toc-card-arrow">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
        </div>
      </a>
    `;
  }).join("");

  // Prepare scroll mode section articles
  const scrollSectionsHtml = sections.map((sec, idx) => {
    const anchor = `section-${sec.id}`;
    const readMins = calculateReadingTime(sec.contentHtml || "");
    const prevSec = sections[idx - 1];
    const nextSec = sections[idx + 1];

    return `
      <article id="${anchor}" class="story-article">
        <header class="story-header">
          <div class="story-kicker">
            <span class="story-badge">STORY ${String(idx + 1).padStart(2, "0")} OF ${String(sections.length).padStart(2, "0")}</span>
            <span class="story-read-time">${readMins} MIN READ</span>
          </div>

          <h2 class="story-title">${escapeHtml(sec.title)}</h2>
          ${sec.subtitle ? `<p class="story-subtitle">${escapeHtml(sec.subtitle)}</p>` : ""}

          ${sec.authorName ? `
            <div class="story-byline">
              <div class="author-avatar">
                <span>${escapeHtml(sec.authorName.charAt(0).toUpperCase())}</span>
              </div>
              <div class="author-info">
                <span class="author-name">${escapeHtml(sec.authorName)}</span>
                ${sec.authorRole ? `<span class="author-role">${escapeHtml(sec.authorRole)}</span>` : ""}
              </div>
            </div>
          ` : ""}
        </header>

        <div class="story-body prose">
          ${sec.contentHtml || '<p class="empty-note">Content for this section is currently being compiled.</p>'}
        </div>

        <footer class="story-footer">
          ${prevSec ? `
            <a href="#section-${prevSec.id}" class="footer-nav-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              <span>Prev: ${escapeHtml(prevSec.title.length > 24 ? prevSec.title.slice(0, 24) + '…' : prevSec.title)}</span>
            </a>
          ` : `
            <a href="#toc" class="footer-nav-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
              <span>Table of Contents</span>
            </a>
          `}

          ${nextSec ? `
            <a href="#section-${nextSec.id}" class="footer-nav-btn primary">
              <span>Next: ${escapeHtml(nextSec.title.length > 24 ? nextSec.title.slice(0, 24) + '…' : nextSec.title)}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </a>
          ` : `
            <a href="#cover" class="footer-nav-btn primary">
              <span>Back to Top</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>
            </a>
          `}
        </footer>
      </article>
    `;
  }).join("");

  const stPages: { density: "hard" | "soft"; html: string }[] = [];

  // Front Hard Cover (Page 1)
  stPages.push({
    density: "hard",
    html: `
      <div class="book-page-content cover-theme">
        <div class="cover-top-box">
          <div class="cover-org-label">${escapeHtml(hospitalName)}</div>
          <div class="cover-badge-pill">${escapeHtml(issue.issueNo)} &bull; ${issueDateStr}</div>
        </div>

        <div class="cover-main-box">
          <h1 class="cover-heading">${escapeHtml(issue.title)}</h1>
          <p class="cover-subtext">${escapeHtml(issue.description || hospitalTagline)}</p>
        </div>

        ${issue.coverImageUrl ? `
          <div class="cover-artwork">
            <img src="${escapeHtml(issue.coverImageUrl)}" alt="Cover Artwork" />
          </div>
        ` : `
          <div class="cover-artwork-mock">
            <span class="cover-mock-emblem">MONTHLY EDITION</span>
          </div>
        `}

        <div class="cover-footer-box">
          <div class="cover-summary-line">${sections.length} Stories &bull; ${totalMinutes} Min Read</div>
          <div class="cover-turn-hint">
            <span>Drag Corner or Click to Open</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
          </div>
        </div>
      </div>
    `,
  });

  // Inside Cover: Editorial Foreword + Quick TOC (Page 2)
  stPages.push({
    density: "hard",
    html: `
      <div class="book-page-content standard-theme">
        <div class="page-running-header">
          <span>EDITORIAL FOREWORD</span>
          <span>${issueDateStr}</span>
        </div>

        <div class="page-inner-scroll">
          <div class="editorial-box">
            <h2 class="editorial-title">From the Editorial Desk</h2>
            <div class="editorial-accent-bar"></div>
            <p class="editorial-text">
              Welcome to the <strong>${issueDateStr}</strong> edition of <em>${escapeHtml(issue.title)}</em>.
              Our clinical teams and departments continue to bring groundbreaking updates, 
              healthcare insights, and medical excellence to our community.
            </p>
          </div>

          <div class="flip-toc-box">
            <div class="flip-toc-title">IN THIS ISSUE</div>
            <div class="flip-toc-entries">
              ${sectionPaging.map((item, sIdx) => `
                <div class="flip-toc-row" onclick="goToFlipPage(${item.startFlipIndex})">
                  <span class="toc-row-num">${String(sIdx + 1).padStart(2, "0")}</span>
                  <span class="toc-row-title">${escapeHtml(item.section.title)}</span>
                  <span class="toc-row-dots"></span>
                  <span class="toc-row-page">P.${item.startPageNum}</span>
                </div>
              `).join("")}
            </div>
          </div>
        </div>

        <div class="page-running-footer">
          <span>${escapeHtml(hospitalName)}</span>
          <span class="page-num-indicator">— 2 —</span>
        </div>
      </div>
    `,
  });

  // Story Pages (Multi-Page Split: Lead Page + Continuation Pages)
  sectionPaging.forEach((item, sIdx) => {
    const sec = item.section;
    const readMins = calculateReadingTime(sec.contentHtml || "");
    const totalParts = item.pages.length;

    item.pages.forEach((pageContent, partIdx) => {
      const pageNum = stPages.length + 1;
      const isLeadPage = partIdx === 0;
      const isLastPart = partIdx === totalParts - 1;

      if (isLeadPage) {
        // Article Lead Page
        stPages.push({
          density: "soft",
          html: `
            <div class="book-page-content standard-theme">
              <div class="page-running-header">
                <span>${escapeHtml(issue.title)} &bull; ${escapeHtml(issue.issueNo)}</span>
                <span>STORY ${String(sIdx + 1).padStart(2, "0")} ${totalParts > 1 ? `(1/${totalParts})` : ""}</span>
              </div>

              <div class="page-inner-scroll">
                <div class="story-page-head">
                  <div class="story-page-kicker">
                    <span class="story-page-badge">FEATURE</span>
                    <span class="story-page-time">${readMins} MIN READ</span>
                  </div>
                  <h2 class="story-page-title">${escapeHtml(sec.title)}</h2>
                  ${sec.subtitle ? `<p class="story-page-subtitle">${escapeHtml(sec.subtitle)}</p>` : ""}

                  ${sec.authorName ? `
                    <div class="story-page-byline">
                      <div class="story-page-avatar">${escapeHtml(sec.authorName.charAt(0).toUpperCase())}</div>
                      <div class="story-page-author-info">
                        <span class="story-page-author-name">${escapeHtml(sec.authorName)}</span>
                        ${sec.authorRole ? `<span class="story-page-author-role">${escapeHtml(sec.authorRole)}</span>` : ""}
                      </div>
                    </div>
                  ` : ""}
                </div>

                <div class="story-page-prose prose">
                  ${pageContent}
                </div>
              </div>

              <div class="page-running-footer">
                <span>${escapeHtml(hospitalName)}</span>
                ${totalParts > 1 ? `<span class="page-continue-hint">Continued on P.${pageNum + 1} &rarr;</span>` : '<span class="page-end-mark">&#9632; End</span>'}
                <span class="page-num-indicator">— ${pageNum} —</span>
              </div>
            </div>
          `,
        });
      } else {
        // Article Continuation Page
        stPages.push({
          density: "soft",
          html: `
            <div class="book-page-content standard-theme continuation-page">
              <div class="page-running-header">
                <span style="font-weight: 700;">${escapeHtml(sec.title)} (Continued)</span>
                <span>Part ${partIdx + 1} of ${totalParts}</span>
              </div>

              <div class="page-inner-scroll">
                <div class="story-page-prose prose continuation-prose">
                  ${pageContent}
                </div>
              </div>

              <div class="page-running-footer">
                <span>${escapeHtml(hospitalName)}</span>
                ${!isLastPart ? `<span class="page-continue-hint">Continued on P.${pageNum + 1} &rarr;</span>` : '<span class="page-end-mark">&#9632; End of Story</span>'}
                <span class="page-num-indicator">— ${pageNum} —</span>
              </div>
            </div>
          `,
        });
      }
    });
  });

  stPages.push({
    density: "hard",
    html: `
      <div class="book-page-content back-theme">
        <div class="back-brand-box">
          <div class="back-crest">ACME</div>
          <h2 class="back-hospital-title">${escapeHtml(hospitalName)}</h2>
          <p class="back-hospital-tagline">${escapeHtml(hospitalTagline)}</p>
        </div>

        <div class="back-info-card">
          <div class="back-info-line">
            <strong>Campus Location:</strong> ${escapeHtml(hospitalAddress)}
          </div>
          <div class="back-info-line">
            <strong>24/7 Emergency:</strong> <span style="color: #ef4444; font-weight:700;">${escapeHtml(hospitalEmergency)}</span>
          </div>
          <div class="back-info-line">
            <strong>OPD & Appointments:</strong> ${escapeHtml(hospitalOpd)}
          </div>
          <div class="back-info-line">
            <strong>Editorial Desk:</strong> ${escapeHtml(hospitalEmail)}
          </div>
          <div class="back-info-line">
            <strong>Web Portal:</strong> ${escapeHtml(hospitalWebsite)}
          </div>
        </div>

        <div class="back-bottom-note">
          <p>${escapeHtml(hospitalDivision)}</p>
          <div class="back-edition-pill">${escapeHtml(issue.issueNo)} &bull; ${issueDateStr}</div>
        </div>
      </div>
    `,
  });

  const stPagesHtml = stPages.map((p, idx) => `
    <div class="page" data-density="${p.density}" data-page="${idx}">
      ${p.html}
    </div>
  `).join("");

  return `<!DOCTYPE html>
<html lang="en" data-theme="dark" data-font="normal" data-mode="flip">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(issue.title)} | ${escapeHtml(hospitalName)} Electronic Magazine</title>
  <meta name="description" content="${escapeHtml(issue.description || `${issue.title} — ${issueDateStr} Edition`)}">
  
  <meta property="og:type" content="article">
  <meta property="og:title" content="${escapeHtml(issue.title)}">
  <meta property="og:description" content="${escapeHtml(issue.description || `${issueDateStr} Edition`)}">
  ${issue.coverImageUrl ? `<meta property="og:image" content="${escapeHtml(issue.coverImageUrl)}">` : ""}

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800;900&family=Lora:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Playfair+Display:ital,wght@0,600;0,700;0,800;0,900;1,600;1,700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600;700&display=swap" rel="stylesheet">

  <!-- StPageFlip Official Browser Library -->
  <script src="https://cdn.jsdelivr.net/npm/page-flip@2.0.7/dist/js/page-flip.browser.js"></script>

  <style>
    /* ==========================================================================
       CSS Variables & Themes
       ========================================================================== */
    :root {
      --font-ui: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      --font-display: 'Playfair Display', Georgia, serif;
      --font-masthead: 'Cinzel', serif;
      --font-prose: 'Lora', Georgia, serif;
      --font-mono: 'JetBrains Mono', monospace;

      --radius-sm: 8px;
      --radius-md: 14px;
      --radius-lg: 20px;
      --radius-xl: 28px;
      --radius-full: 9999px;
    }

    /* DARK LUXURY THEME */
    html[data-theme="dark"] {
      --bg-page: #06090e;
      --bg-canvas: #0c121c;
      --bg-card: #111a28;
      --bg-card-hover: #162234;
      --bg-elevated: #1a273b;
      --bg-glass: rgba(12, 18, 28, 0.88);

      --page-bg: #0f172a;
      --page-text: #e2e8f0;
      --page-muted: #94a3b8;
      --page-border: rgba(255, 255, 255, 0.09);
      --page-shadow: 0 15px 35px rgba(0, 0, 0, 0.6);
      
      --text-main: #f3f6fc;
      --text-body: #d2dbe9;
      --text-muted: #8b9bb4;
      --text-dim: #5c6b84;

      --border-main: rgba(255, 255, 255, 0.08);
      --border-accent: rgba(56, 189, 248, 0.25);

      --primary: #38bdf8;
      --primary-rgb: 56, 189, 248;
      --primary-glow: rgba(56, 189, 248, 0.2);
      
      --accent-gradient: linear-gradient(135deg, #38bdf8 0%, #818cf8 50%, #c084fc 100%);
      --blockquote-bg: rgba(56, 189, 248, 0.06);
      --blockquote-border: #38bdf8;
      --blockquote-text: #e0f2fe;
    }

    /* LIGHT EDITORIAL THEME */
    html[data-theme="light"] {
      --bg-page: #f1f4f9;
      --bg-canvas: #ffffff;
      --bg-card: #ffffff;
      --bg-card-hover: #f8fafc;
      --bg-elevated: #f1f5f9;
      --bg-glass: rgba(255, 255, 255, 0.9);

      --page-bg: #ffffff;
      --page-text: #1e293b;
      --page-muted: #64748b;
      --page-border: #e2e8f0;
      --page-shadow: 0 12px 30px rgba(0, 0, 0, 0.1);

      --text-main: #090e17;
      --text-body: #233044;
      --text-muted: #576882;
      --text-dim: #8c9cb2;

      --border-main: #e2e8f0;
      --border-accent: rgba(2, 132, 199, 0.3);

      --primary: #0284c7;
      --primary-rgb: 2, 132, 199;
      --primary-glow: rgba(2, 132, 199, 0.15);

      --accent-gradient: linear-gradient(135deg, #0284c7 0%, #4f46e5 100%);
      --blockquote-bg: #f0f9ff;
      --blockquote-border: #0284c7;
      --blockquote-text: #0369a1;
    }

    /* SEPIA PARCHMENT THEME */
    html[data-theme="sepia"] {
      --bg-page: #efe7d9;
      --bg-canvas: #faf6ee;
      --bg-card: #faf6ee;
      --bg-card-hover: #f5eedf;
      --bg-elevated: #ece2d0;
      --bg-glass: rgba(250, 246, 238, 0.92);

      --page-bg: #faf6ee;
      --page-text: #2c2116;
      --page-muted: #735e4b;
      --page-border: #e6dac6;
      --page-shadow: 0 12px 30px rgba(68, 43, 20, 0.12);

      --text-main: #2b1f14;
      --text-body: #3d2f21;
      --text-muted: #6e5945;
      --text-dim: #99836e;

      --border-main: #dfd3c1;
      --border-accent: rgba(161, 98, 7, 0.35);

      --primary: #a16207;
      --primary-rgb: 161, 98, 7;
      --primary-glow: rgba(161, 98, 7, 0.15);

      --accent-gradient: linear-gradient(135deg, #b45309 0%, #78350f 100%);
      --blockquote-bg: #f5eedf;
      --blockquote-border: #a16207;
      --blockquote-text: #78350f;
    }

    /* Font Scale */
    html[data-font="small"] { --prose-font-size: 1rem; --prose-line-height: 1.75; }
    html[data-font="normal"] { --prose-font-size: 1.15rem; --prose-line-height: 1.85; }
    html[data-font="large"] { --prose-font-size: 1.3rem; --prose-line-height: 1.95; }

    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    html {
      scroll-behavior: smooth;
      -webkit-font-smoothing: antialiased;
    }

    body {
      font-family: var(--font-ui);
      background-color: var(--bg-page);
      color: var(--text-main);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      transition: background-color 0.3s ease, color 0.3s ease;
    }

    /* StPageFlip Mode Viewport Lock */
    html[data-mode="flip"],
    html[data-mode="flip"] body {
      height: 100vh;
      max-height: 100vh;
      overflow: hidden;
    }

    html[data-mode="flip"] .site-footer {
      display: none !important;
    }

    /* Scroll Mode */
    html[data-mode="scroll"],
    html[data-mode="scroll"] body {
      height: auto;
      overflow-y: auto;
    }

    html[data-mode="scroll"] .site-footer {
      display: block;
    }

    /* Reading Progress Bar */
    .progress-bar-container {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 4px;
      z-index: 100;
    }

    .progress-bar-fill {
      height: 100%;
      width: 0%;
      background: var(--accent-gradient);
      box-shadow: 0 0 12px var(--primary);
      transition: width 0.1s ease-out;
    }

    /* Sticky Header */
    .sticky-header {
      position: sticky;
      top: 0;
      z-index: 90;
      background: var(--bg-glass);
      backdrop-filter: blur(16px);
      border-bottom: 1px solid var(--border-main);
      padding: 0.5rem 1.25rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 52px;
      box-sizing: border-box;
      transition: padding 0.2s ease;
    }

    .nav-left { display: flex; align-items: center; gap: 0.75rem; min-width: 0; }
    .brand-mark { display: flex; align-items: center; gap: 0.6rem; text-decoration: none; color: inherit; min-width: 0; }
    .brand-badge { font-family: var(--font-masthead); background: var(--accent-gradient); color: white; font-weight: 800; font-size: 0.72rem; letter-spacing: 0.15em; padding: 0.3rem 0.6rem; border-radius: var(--radius-sm); flex-shrink: 0; }
    .brand-title { font-weight: 700; font-size: 0.92rem; display: flex; align-items: center; gap: 0.45rem; min-width: 0; }
    .brand-title-text { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 240px; }
    .brand-issue-pill { font-family: var(--font-mono); font-size: 0.7rem; color: var(--text-muted); background: var(--bg-elevated); padding: 0.15rem 0.45rem; border-radius: var(--radius-sm); white-space: nowrap; flex-shrink: 0; }
    
    .nav-controls { display: flex; align-items: center; gap: 0.4rem; flex-shrink: 0; }
    .mode-toggle-group { display: flex; align-items: center; background: var(--bg-elevated); border: 1px solid var(--border-main); border-radius: var(--radius-sm); padding: 2px; }
    .mode-btn { display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.35rem 0.65rem; border-radius: 6px; font-size: 0.78rem; font-weight: 700; color: var(--text-muted); border: none; background: transparent; cursor: pointer; transition: all 0.15s ease; }
    .mode-btn.active { background: var(--bg-card); color: var(--primary); box-shadow: 0 1px 3px rgba(0,0,0,0.2); }
    .control-btn { display: inline-flex; align-items: center; justify-content: center; gap: 0.4rem; background: var(--bg-card); color: var(--text-main); border: 1px solid var(--border-main); padding: 0.4rem 0.75rem; border-radius: var(--radius-sm); font-size: 0.8rem; font-weight: 600; cursor: pointer; text-decoration: none; transition: all 0.15s ease; }
    .control-btn:hover { background: var(--bg-card-hover); border-color: var(--primary); transform: translateY(-1px); }
    .control-icon-btn { width: 34px; height: 34px; padding: 0; border-radius: var(--radius-sm); }

    @media (max-width: 860px) {
      .brand-title-text { display: none; }
      .print-btn { display: none !important; }
    }

    @media (max-width: 640px) {
      .sticky-header { padding: 0.35rem 0.65rem; height: 48px; }
      .nav-btn-label { display: none; }
      .brand-issue-pill { display: none; }
      .brand-badge { padding: 0.25rem 0.45rem; font-size: 0.65rem; }
      .control-btn { padding: 0.35rem 0.5rem; font-size: 0.75rem; }
      .control-icon-btn { width: 32px; height: 32px; }
      .mode-btn { padding: 0.35rem 0.45rem; }
      .mode-toggle-group { padding: 1px; }
      .nav-controls { gap: 0.25rem; }
      .nav-left { gap: 0.4rem; }
    }

    /* ==========================================================================
       StPageFlip OFFICIAL STAGE & BOOK SHELL
       ========================================================================== */
    .stpageflip-container {
      display: none;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: calc(100vh - 52px);
      max-height: calc(100vh - 52px);
      padding: 0.5rem 0.75rem 4.25rem;
      position: relative;
      user-select: none;
      overflow: hidden;
      box-sizing: border-box;
    }

    html[data-mode="flip"] .stpageflip-container { display: flex; }
    html[data-mode="scroll"] .stpageflip-container { display: none; }

    @media (max-width: 640px) {
      .stpageflip-container {
        height: calc(100vh - 48px);
        max-height: calc(100vh - 48px);
        padding: 0.25rem 0.25rem 3.5rem;
      }
    }

    .stpageflip-stage-wrapper {
      position: relative;
      display: flex;
      justify-content: center;
      align-items: center;
      width: 100%;
      max-width: 1150px;
      height: calc(100vh - 135px);
      margin: 0 auto;
    }

    @media (max-width: 640px) {
      .stpageflip-stage-wrapper {
        height: calc(100vh - 110px);
      }
    }

    #book {
      margin: 0 auto;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.55);
      border-radius: 4px;
      background: transparent;
    }

    /* StPageFlip Individual Page */
    .page {
      background-color: var(--page-bg);
      color: var(--page-text);
      overflow: hidden;
      box-sizing: border-box;
      border: 1px solid var(--page-border);
      position: relative;
    }

    .page[data-density="hard"] {
      background-color: var(--bg-elevated);
    }

    .book-page-content {
      height: 100%;
      width: 100%;
      display: flex;
      flex-direction: column;
      padding: 2.25rem 2.25rem 1.5rem;
      box-sizing: border-box;
      position: relative;
      overflow: hidden;
    }

    @media (max-width: 900px) {
      .book-page-content {
        padding: 1.5rem 1.25rem 1rem;
      }
    }

    @media (max-width: 600px) {
      .book-page-content {
        padding: 1rem 0.85rem 0.75rem;
      }
    }

    .page-running-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-family: var(--font-mono);
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--page-muted);
      border-bottom: 1px solid var(--page-border);
      padding-bottom: 0.6rem;
      margin-bottom: 1.25rem;
      flex-shrink: 0;
    }

    @media (max-width: 600px) {
      .page-running-header {
        margin-bottom: 0.65rem;
        padding-bottom: 0.35rem;
        font-size: 0.62rem;
      }
    }

    .page-inner-scroll {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      display: flex;
      flex-direction: column;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: thin;
      scrollbar-color: var(--border-accent) transparent;
    }

    .page-inner-scroll::-webkit-scrollbar {
      width: 4px;
    }
    .page-inner-scroll::-webkit-scrollbar-thumb {
      background: var(--border-accent);
      border-radius: 4px;
    }

    .page-running-footer {
      margin-top: auto;
      padding-top: 0.65rem;
      border-top: 1px solid var(--page-border);
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.75rem;
      color: var(--page-muted);
      flex-shrink: 0;
    }

    @media (max-width: 600px) {
      .page-running-footer {
        padding-top: 0.4rem;
        font-size: 0.68rem;
      }
    }

    .page-num-indicator {
      font-family: var(--font-display);
      font-weight: 700;
    }

    .page-continue-hint {
      font-family: var(--font-mono);
      font-size: 0.72rem;
      color: var(--primary);
      font-weight: 600;
      font-style: italic;
    }

    .page-end-mark {
      font-family: var(--font-mono);
      font-size: 0.72rem;
      color: var(--page-muted);
      font-weight: 700;
    }

    .continuation-page .continuation-prose {
      padding-top: 0.25rem;
    }

    .continuation-prose > p:first-of-type::first-letter {
      float: none !important;
      font-size: inherit !important;
      font-weight: inherit !important;
      color: inherit !important;
      padding: 0 !important;
    }

    .story-page-prose {
      font-family: var(--font-prose);
      font-size: 0.95rem;
      line-height: 1.65;
      color: var(--page-text);
    }

    .story-page-prose > p:first-of-type::first-letter {
      font-family: var(--font-display);
      float: left;
      font-size: clamp(2rem, 5vw, 2.8rem);
      line-height: 0.85;
      padding-top: 2px;
      padding-right: 8px;
      font-weight: 900;
      color: var(--primary);
    }

    .story-page-prose p {
      margin-bottom: 0.85rem;
    }

    .story-page-prose h1, .story-page-prose h2, .story-page-prose h3 {
      font-family: var(--font-ui);
      font-weight: 800;
      margin-top: 0.75rem;
      margin-bottom: 0.4rem;
      line-height: 1.3;
      font-size: 1.15rem;
    }

    .story-page-prose blockquote {
      margin: 0.85rem 0;
      padding: 0.6rem 1rem;
      background: var(--blockquote-bg);
      border-left: 3px solid var(--blockquote-border);
      border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
      font-family: var(--font-display);
      font-style: italic;
      font-size: 0.95rem;
      line-height: 1.5;
      color: var(--blockquote-text);
    }

    .story-page-prose table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.75rem;
      margin: 0.5rem 0;
      display: block;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }

    .story-page-prose th, .story-page-prose td {
      padding: 0.35rem 0.5rem;
      border: 1px solid var(--page-border);
    }

    .story-page-prose img {
      max-width: 100%;
      max-height: 200px;
      object-fit: cover;
      border-radius: var(--radius-sm);
      margin: 0.65rem auto;
      display: block;
      border: 1px solid var(--page-border);
    }

    /* Cover Styling */
    .book-page-content.cover-theme {
      background: radial-gradient(circle at top right, rgba(56, 189, 248, 0.22), transparent 60%),
                  radial-gradient(circle at bottom left, rgba(147, 51, 234, 0.16), transparent 50%),
                  var(--bg-elevated);
      color: var(--text-main);
      justify-content: space-between;
      text-align: center;
      padding: 3rem 2.5rem 2rem;
    }

    @media (max-width: 600px) {
      .book-page-content.cover-theme {
        padding: 1.5rem 1rem 1rem;
      }
    }

    .cover-org-label {
      font-family: var(--font-masthead);
      font-size: 0.85rem;
      font-weight: 900;
      letter-spacing: 0.22em;
      color: var(--primary);
      text-transform: uppercase;
      margin-bottom: 0.4rem;
    }

    .cover-badge-pill {
      font-family: var(--font-mono);
      font-size: 0.72rem;
      color: var(--text-muted);
    }

    .cover-heading {
      font-family: var(--font-display);
      font-size: clamp(1.4rem, 4vw, 2.75rem);
      font-weight: 900;
      line-height: 1.15;
      letter-spacing: -0.02em;
      margin: 0.75rem 0 0.4rem;
    }

    .cover-subtext {
      font-family: var(--font-prose);
      font-size: clamp(0.82rem, 2vw, 0.95rem);
      color: var(--text-muted);
      line-height: 1.5;
    }

    .cover-artwork {
      width: 100%;
      height: 230px;
      max-height: 35vh;
      border-radius: var(--radius-md);
      overflow: hidden;
      margin: 1.25rem 0;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.35);
      border: 1px solid var(--border-main);
    }

    @media (max-width: 600px) {
      .cover-artwork {
        height: 140px;
        margin: 0.65rem 0;
      }
    }

    .cover-artwork img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .cover-artwork-mock {
      width: 100%;
      height: 200px;
      max-height: 30vh;
      border-radius: var(--radius-md);
      background: var(--bg-card);
      border: 1px dashed var(--border-accent);
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 1.25rem 0;
    }

    @media (max-width: 600px) {
      .cover-artwork-mock {
        height: 130px;
        margin: 0.65rem 0;
      }
    }

    .cover-mock-emblem {
      font-family: var(--font-masthead);
      font-weight: 800;
      letter-spacing: 0.15em;
      color: var(--primary);
      background: var(--primary-glow);
      padding: 0.5rem 1.2rem;
      border-radius: var(--radius-full);
      border: 1px solid var(--border-accent);
      font-size: 0.8rem;
    }

    .cover-summary-line {
      font-size: 0.82rem;
      font-weight: 600;
      color: var(--text-main);
      margin-bottom: 0.5rem;
    }

    .cover-turn-hint {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      font-family: var(--font-mono);
      font-size: 0.75rem;
      color: var(--primary);
      font-weight: 700;
    }

    /* Inside Cover & Editorial Foreword */
    .editorial-box { margin-bottom: 1.75rem; }
    .editorial-title { font-family: var(--font-display); font-size: clamp(1.2rem, 3vw, 1.5rem); font-weight: 800; margin-bottom: 0.35rem; }
    .editorial-accent-bar { width: 40px; height: 3px; background: var(--primary); margin-bottom: 0.85rem; border-radius: var(--radius-full); }
    .editorial-text { font-family: var(--font-prose); font-size: clamp(0.85rem, 2vw, 0.95rem); line-height: 1.65; color: var(--page-muted); }

    .flip-toc-title { font-family: var(--font-ui); font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.12em; color: var(--primary); font-weight: 800; margin-bottom: 0.85rem; }
    .flip-toc-entries { display: flex; flex-direction: column; gap: 0.65rem; }
    .flip-toc-row { display: flex; align-items: center; gap: 0.5rem; font-size: 0.88rem; cursor: pointer; padding: 0.35rem 0.5rem; border-radius: 6px; transition: all 0.15s ease; }
    .flip-toc-row:hover { background: var(--primary-glow); color: var(--primary); }
    .toc-row-num { font-family: var(--font-display); font-weight: 800; color: var(--primary); min-width: 1.5rem; }
    .toc-row-title { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; }
    .toc-row-dots { flex: 1; border-bottom: 1px dotted var(--page-muted); margin: 0 0.25rem; opacity: 0.4; }
    .toc-row-page { font-family: var(--font-mono); font-size: 0.75rem; color: var(--page-muted); }

    @media (max-width: 600px) {
      .editorial-box { margin-bottom: 1rem; }
      .flip-toc-row { font-size: 0.78rem; padding: 0.25rem 0.35rem; }
    }

    /* Story Page */
    .story-page-head { margin-bottom: 1.25rem; padding-bottom: 1rem; border-bottom: 1px solid var(--page-border); flex-shrink: 0; }
    .story-page-kicker { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.4rem; }
    .story-page-badge { font-family: var(--font-mono); font-size: 0.68rem; font-weight: 700; letter-spacing: 0.12em; color: var(--primary); background: var(--primary-glow); padding: 0.15rem 0.5rem; border-radius: var(--radius-full); border: 1px solid var(--border-accent); }
    .story-page-time { font-family: var(--font-mono); font-size: 0.68rem; color: var(--page-muted); }
    .story-page-title { font-family: var(--font-display); font-size: clamp(1.2rem, 3.5vw, 1.75rem); font-weight: 800; line-height: 1.2; letter-spacing: -0.015em; margin-bottom: 0.35rem; }
    .story-page-subtitle { font-family: var(--font-ui); font-size: clamp(0.8rem, 2vw, 0.95rem); color: var(--page-muted); line-height: 1.45; margin-bottom: 0.75rem; }
    .story-page-byline { display: flex; align-items: center; gap: 0.6rem; margin-top: 0.5rem; }
    .story-page-avatar { width: 32px; height: 32px; border-radius: 50%; background: var(--accent-gradient); color: white; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.85rem; flex-shrink: 0; }
    .story-page-author-info { display: flex; flex-direction: column; }
    .story-page-author-name { font-weight: 700; font-size: 0.85rem; }
    .story-page-author-role { font-size: 0.72rem; color: var(--page-muted); }

    @media (max-width: 600px) {
      .story-page-head { margin-bottom: 0.75rem; padding-bottom: 0.5rem; }
      .story-page-subtitle { margin-bottom: 0.4rem; }
      .story-page-avatar { width: 28px; height: 28px; font-size: 0.75rem; }
      .story-page-author-name { font-size: 0.78rem; }
    }

    /* Back Cover */
    .book-page-content.back-theme {
      background: radial-gradient(circle at center, rgba(56, 189, 248, 0.1), transparent 70%), var(--bg-elevated);
      justify-content: space-between;
      align-items: center;
      text-align: center;
      padding: 3.5rem 2.5rem;
    }

    @media (max-width: 600px) {
      .book-page-content.back-theme {
        padding: 1.75rem 1rem;
      }
    }

    .back-crest { font-family: var(--font-masthead); font-size: 1.75rem; font-weight: 900; letter-spacing: 0.2em; background: var(--accent-gradient); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 0.5rem; }
    .back-hospital-title { font-family: var(--font-display); font-size: 1.4rem; font-weight: 800; margin-bottom: 0.35rem; }
    .back-hospital-tagline { font-size: 0.85rem; color: var(--text-muted); max-width: 320px; margin: 0 auto; }
    .back-info-card { background: var(--bg-card); border: 1px solid var(--border-main); border-radius: var(--radius-md); padding: 1.25rem 1.5rem; width: 100%; max-width: 340px; font-size: 0.8rem; text-align: left; display: flex; flex-direction: column; gap: 0.5rem; }
    .back-bottom-note { font-size: 0.75rem; color: var(--text-dim); }
    .back-edition-pill { font-family: var(--font-mono); font-size: 0.72rem; color: var(--primary); background: var(--primary-glow); padding: 0.25rem 0.65rem; border-radius: var(--radius-full); display: inline-block; margin-top: 0.5rem; border: 1px solid var(--border-accent); }

    /* Floating Side Navigation Arrows */
    .side-nav-arrow {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: var(--bg-glass);
      backdrop-filter: blur(12px);
      border: 1px solid var(--border-main);
      color: var(--text-main);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 50;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.35);
      transition: all 0.2s ease;
    }

    .side-nav-arrow:hover {
      background: var(--primary);
      color: white;
      border-color: var(--primary);
      transform: translateY(-50%) scale(1.1);
    }

    .side-nav-arrow.prev { left: 0.25rem; }
    .side-nav-arrow.next { right: 0.25rem; }

    @media (max-width: 820px) {
      .side-nav-arrow {
        display: none !important;
      }
    }

    /* Bottom Control Dock */
    .dock-bar {
      position: fixed;
      bottom: max(1rem, env(safe-area-inset-bottom, 1rem));
      left: 50%;
      transform: translateX(-50%);
      z-index: 80;
      display: none;
      align-items: center;
      gap: 0.5rem;
      background: var(--bg-glass);
      backdrop-filter: blur(20px);
      border: 1px solid var(--border-main);
      padding: 0.4rem 0.85rem;
      border-radius: var(--radius-full);
      box-shadow: 0 15px 35px rgba(0, 0, 0, 0.4);
      max-width: calc(100vw - 20px);
      box-sizing: border-box;
    }

    html[data-mode="flip"] .dock-bar { display: flex; }

    .dock-btn {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border: 1px solid var(--border-main);
      background: var(--bg-card);
      color: var(--text-main);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.15s ease;
      flex-shrink: 0;
    }

    .dock-btn:hover {
      background: var(--primary);
      color: white;
      border-color: var(--primary);
      transform: scale(1.08);
    }

    .dock-page-display {
      font-family: var(--font-mono);
      font-size: 0.82rem;
      font-weight: 700;
      color: var(--text-main);
      padding: 0 0.4rem;
      display: flex;
      align-items: center;
      gap: 0.35rem;
      white-space: nowrap;
    }

    .dock-divider { width: 1px; height: 20px; background: var(--border-main); margin: 0 0.15rem; flex-shrink: 0; }

    @media (max-width: 520px) {
      .dock-bar {
        padding: 0.3rem 0.5rem;
        gap: 0.25rem;
        bottom: max(0.5rem, env(safe-area-inset-bottom, 0.5rem));
      }
      .dock-btn {
        width: 32px;
        height: 32px;
      }
      .dock-btn-secondary {
        display: none !important;
      }
      .dock-page-display {
        font-size: 0.75rem;
        padding: 0 0.2rem;
      }
    }

    /* ==========================================================================
       SCROLL MODE INFINITE FLOW & FIXES
       ========================================================================== */
    .magazine-scroll-wrapper {
      display: none;
      width: 100%;
      max-width: 960px;
      margin: 0 auto;
      padding: 2rem 1.25rem 4rem;
      box-sizing: border-box;
    }
    html[data-mode="scroll"] .magazine-scroll-wrapper { display: block; }
    html[data-mode="flip"] .magazine-scroll-wrapper { display: none; }

    /* Key Anchor Fix: Scroll Margin Offset so Sticky Header Never Clips Section Heads */
    .story-article,
    .cover-hero-card,
    .toc-section {
      scroll-margin-top: 72px;
    }

    .cover-hero-card { position: relative; background: var(--bg-card); border-radius: var(--radius-xl); box-shadow: 0 12px 36px rgba(0, 0, 0, 0.55); border: 1px solid var(--border-main); overflow: hidden; margin-bottom: 3.5rem; }
    .cover-masthead { position: relative; padding: 3.5rem 3rem 2.75rem; background: radial-gradient(circle at top right, rgba(56, 189, 248, 0.12), transparent 60%), radial-gradient(circle at bottom left, rgba(147, 51, 234, 0.1), transparent 50%), var(--bg-elevated); border-bottom: 1px solid var(--border-main); }
    .masthead-eyebrow { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 0.5rem; }
    .org-banner { font-family: var(--font-masthead); font-size: 0.85rem; font-weight: 800; letter-spacing: 0.2em; color: var(--primary); }
    .edition-tag { font-family: var(--font-mono); font-size: 0.75rem; font-weight: 700; color: var(--text-muted); background: var(--bg-card); padding: 0.3rem 0.75rem; border-radius: var(--radius-full); border: 1px solid var(--border-main); }
    .cover-title { font-family: var(--font-display); font-size: clamp(2rem, 5vw, 3.8rem); font-weight: 900; line-height: 1.1; letter-spacing: -0.025em; margin-bottom: 1.25rem; }
    .cover-description { font-family: var(--font-prose); font-size: clamp(1rem, 2.5vw, 1.2rem); line-height: 1.6; color: var(--text-muted); max-width: 720px; margin-bottom: 2rem; }
    .cover-meta-bar { display: flex; flex-wrap: wrap; align-items: center; gap: 1.5rem 2rem; padding-top: 1.75rem; border-top: 1px solid var(--border-main); }
    .meta-stat { display: flex; flex-direction: column; gap: 0.2rem; }
    .meta-stat-label { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-dim); }
    .meta-stat-value { font-weight: 700; font-size: 0.95rem; }
    .cover-actions { margin-left: auto; display: flex; align-items: center; gap: 0.75rem; }
    .primary-action-btn { background: var(--accent-gradient); color: white; border: none; font-weight: 700; padding: 0.7rem 1.4rem; border-radius: var(--radius-sm); display: inline-flex; align-items: center; gap: 0.5rem; text-decoration: none; cursor: pointer; transition: all 0.2s ease; }
    .cover-image-container { position: relative; width: 100%; max-height: 520px; overflow: hidden; background: #000; }
    .cover-image-container img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1); }

    .toc-section { background: var(--bg-card); border-radius: var(--radius-lg); border: 1px solid var(--border-main); padding: 2.5rem; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3); margin-bottom: 4rem; }
    .toc-section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 2rem; padding-bottom: 1.25rem; border-bottom: 1px solid var(--border-main); flex-wrap: wrap; gap: 0.75rem; }
    .toc-section-title { font-family: var(--font-display); font-size: clamp(1.35rem, 3.5vw, 1.75rem); font-weight: 800; display: flex; align-items: center; gap: 0.75rem; }
    .toc-grid { display: grid; grid-template-columns: 1fr; gap: 1rem; }
    @media (min-width: 680px) { .toc-grid { grid-template-columns: 1fr 1fr; } }
    .toc-card { display: flex; align-items: flex-start; gap: 1rem; padding: 1.15rem; background: var(--bg-elevated); border: 1px solid var(--border-main); border-radius: var(--radius-md); text-decoration: none; color: inherit; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
    .toc-card:hover { background: var(--bg-card-hover); border-color: var(--primary); transform: translateY(-2px); }
    .toc-card.active-reading { border-color: var(--primary); background: var(--primary-glow); }
    .toc-card-num { font-family: var(--font-display); font-size: 1.4rem; font-weight: 800; color: var(--primary); min-width: 1.6rem; }
    .toc-card-body { flex: 1; min-width: 0; }
    .toc-card-title { font-weight: 700; font-size: 0.98rem; margin-bottom: 0.3rem; word-break: break-word; }
    .toc-card-sub { font-size: 0.82rem; color: var(--text-muted); margin-bottom: 0.4rem; line-height: 1.4; }
    .toc-card-meta { display: flex; flex-wrap: wrap; gap: 0.5rem; font-size: 0.75rem; color: var(--text-dim); }
    .toc-card-arrow { color: var(--text-dim); transition: transform 0.2s ease, color 0.2s ease; margin-top: 2px; }
    .toc-card:hover .toc-card-arrow { color: var(--primary); transform: translateX(4px); }

    .story-article { background: var(--bg-card); border-radius: var(--radius-xl); border: 1px solid var(--border-main); box-shadow: 0 12px 36px rgba(0, 0, 0, 0.55); padding: 4rem 3.5rem; margin-bottom: 4rem; position: relative; }
    .story-header { margin-bottom: 2.5rem; padding-bottom: 1.75rem; border-bottom: 1px solid var(--border-main); }
    .story-kicker { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem; flex-wrap: wrap; gap: 0.5rem; }
    .story-badge { font-family: var(--font-mono); font-size: 0.72rem; font-weight: 700; color: var(--primary); background: var(--primary-glow); padding: 0.2rem 0.6rem; border-radius: var(--radius-full); border: 1px solid var(--border-accent); }
    .story-read-time { font-family: var(--font-mono); font-size: 0.72rem; color: var(--text-muted); }
    .story-title { font-family: var(--font-display); font-size: clamp(1.85rem, 4vw, 2.85rem); font-weight: 800; line-height: 1.18; margin-bottom: 0.85rem; word-break: break-word; }
    .story-subtitle { font-family: var(--font-ui); font-size: clamp(0.95rem, 2vw, 1.15rem); color: var(--text-muted); line-height: 1.5; margin-bottom: 1.25rem; }
    .story-byline { display: flex; align-items: center; gap: 0.75rem; margin-top: 1rem; }
    .author-avatar { width: 38px; height: 38px; border-radius: 50%; background: var(--accent-gradient); color: white; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.95rem; flex-shrink: 0; }
    .author-info { display: flex; flex-direction: column; }
    .author-name { font-weight: 700; font-size: 0.92rem; }
    .author-role { font-size: 0.78rem; color: var(--text-muted); }

    .story-body { font-family: var(--font-prose); font-size: var(--prose-font-size, 1.15rem); line-height: var(--prose-line-height, 1.85); color: var(--text-body); }
    .story-body p { margin-bottom: 1.4rem; }
    .story-body h2, .story-body h3, .story-body h4 { font-family: var(--font-ui); font-weight: 800; margin-top: 2rem; margin-bottom: 0.75rem; line-height: 1.3; }
    .story-body h3 { font-size: 1.35rem; }
    .story-body blockquote { margin: 2rem 0; padding: 1.25rem 1.75rem; background: var(--blockquote-bg); border-left: 4px solid var(--blockquote-border); border-radius: 0 var(--radius-md) var(--radius-md) 0; font-family: var(--font-display); font-style: italic; font-size: clamp(1.05rem, 2.5vw, 1.25rem); line-height: 1.6; color: var(--blockquote-text); }
    .story-body img { width: 100%; max-width: 100%; height: auto; border-radius: var(--radius-md); margin: 2rem 0; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.35); border: 1px solid var(--border-main); display: block; }
    
    .story-body table {
      width: 100%;
      border-collapse: collapse;
      margin: 1.5rem 0;
      display: block;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }
    .story-body th, .story-body td {
      padding: 0.6rem 0.85rem;
      border: 1px solid var(--border-main);
    }
    .story-body pre {
      max-width: 100%;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      padding: 1rem;
      background: var(--bg-elevated);
      border-radius: var(--radius-sm);
      margin: 1.5rem 0;
    }

    .story-footer { margin-top: 3rem; padding-top: 1.75rem; border-top: 1px solid var(--border-main); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem; }
    .footer-nav-btn { display: inline-flex; align-items: center; gap: 0.5rem; font-family: var(--font-ui); font-size: 0.88rem; font-weight: 600; color: var(--text-muted); text-decoration: none; padding: 0.6rem 1.2rem; border-radius: var(--radius-sm); background: var(--bg-elevated); border: 1px solid var(--border-main); transition: all 0.2s ease; }
    .footer-nav-btn.primary { color: var(--primary); background: var(--primary-glow); border-color: var(--border-accent); }

    @media (max-width: 768px) {
      .magazine-scroll-wrapper {
        padding: 1rem 0.75rem 3rem;
      }
      .cover-hero-card {
        border-radius: var(--radius-lg);
        margin-bottom: 2rem;
      }
      .cover-masthead {
        padding: 1.75rem 1.25rem 1.5rem;
      }
      .cover-title {
        font-size: clamp(1.75rem, 6vw, 2.5rem);
        margin-bottom: 0.75rem;
      }
      .cover-description {
        font-size: 1rem;
        line-height: 1.55;
        margin-bottom: 1.25rem;
      }
      .cover-meta-bar {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 1rem;
        padding-top: 1.25rem;
      }
      .cover-actions {
        grid-column: 1 / -1;
        margin-left: 0;
        width: 100%;
        margin-top: 1rem;
      }
    }

    /* Toast notification */
    .toast-msg {
      position: fixed;
      bottom: 2rem;
      left: 50%;
      transform: translateX(-50%) translateY(100px);
      background: var(--text-main);
      color: var(--bg-page);
      font-weight: 600;
      font-size: 0.85rem;
      padding: 0.75rem 1.5rem;
      border-radius: var(--radius-full);
      z-index: 200;
      opacity: 0;
      transition: all 0.3s;
      pointer-events: none;
    }
    .toast-msg.show {
      transform: translateX(-50%) translateY(0);
      opacity: 1;
    }

    /* ==========================================================================
       LUXURY EDITORIAL FOOTER
       ========================================================================== */
    .site-footer {
      position: relative;
      background: radial-gradient(circle at top right, rgba(56, 189, 248, 0.08), transparent 60%),
                  radial-gradient(circle at bottom left, rgba(147, 51, 234, 0.06), transparent 50%),
                  var(--bg-card);
      border-top: 1px solid var(--border-main);
      padding: 4.5rem 1.5rem 2.5rem;
      margin-top: auto;
      color: var(--text-main);
    }

    @media (max-width: 768px) {
      .site-footer {
        padding: 3.5rem 1.25rem 2rem;
      }
    }

    .footer-inner-container {
      max-width: 1100px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 3.5rem;
    }

    .footer-main-grid {
      display: grid;
      grid-template-columns: 1.4fr 1fr 1.3fr 1.1fr;
      gap: 2.5rem;
    }

    @media (max-width: 992px) {
      .footer-main-grid {
        grid-template-columns: 1fr 1fr;
        gap: 2.25rem;
      }
    }

    @media (max-width: 600px) {
      .footer-main-grid {
        grid-template-columns: 1fr;
        gap: 2.25rem;
      }
    }

    .footer-col {
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }

    .footer-col-title {
      font-family: var(--font-masthead);
      font-size: 0.82rem;
      font-weight: 800;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: var(--primary);
      margin-bottom: 0.25rem;
    }

    .footer-brand-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.6rem;
      font-family: var(--font-masthead);
      font-weight: 900;
      font-size: 1.15rem;
      letter-spacing: 0.15em;
      background: var(--accent-gradient);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 0.15rem;
    }

    .footer-hospital-title {
      font-family: var(--font-display);
      font-size: 1.25rem;
      font-weight: 800;
      line-height: 1.25;
      color: var(--text-main);
    }

    .footer-hospital-tagline {
      font-family: var(--font-prose);
      font-size: 0.88rem;
      line-height: 1.55;
      color: var(--text-muted);
    }

    .footer-meta-pill {
      font-family: var(--font-mono);
      font-size: 0.72rem;
      color: var(--primary);
      background: var(--primary-glow);
      padding: 0.3rem 0.75rem;
      border-radius: var(--radius-full);
      border: 1px solid var(--border-accent);
      display: inline-block;
      width: fit-content;
      margin-top: 0.35rem;
    }

    .footer-links-list {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
    }

    .footer-link-item {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-muted);
      text-decoration: none;
      transition: all 0.2s ease;
      cursor: pointer;
      background: transparent;
      border: none;
      padding: 0;
      text-align: left;
    }

    .footer-link-item:hover {
      color: var(--primary);
      transform: translateX(4px);
    }

    .footer-contact-list {
      display: flex;
      flex-direction: column;
      gap: 0.8rem;
      font-size: 0.84rem;
    }

    .footer-contact-item {
      display: flex;
      align-items: flex-start;
      gap: 0.65rem;
      color: var(--text-muted);
      line-height: 1.45;
    }

    .footer-contact-item svg {
      flex-shrink: 0;
      margin-top: 2px;
      color: var(--primary);
    }

    .footer-contact-item.emergency {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      padding: 0.55rem 0.75rem;
      border-radius: var(--radius-sm);
      color: #fca5a5;
      font-weight: 700;
    }

    html[data-theme="light"] .footer-contact-item.emergency {
      color: #b91c1c;
      background: #fef2f2;
      border-color: #fca5a5;
    }

    .footer-contact-item.emergency svg {
      color: #ef4444;
    }

    .footer-disclaimer-text {
      font-size: 0.82rem;
      line-height: 1.6;
      color: var(--text-dim);
    }

    .footer-bottom-bar {
      padding-top: 2rem;
      border-top: 1px solid var(--border-main);
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 1rem;
      font-size: 0.78rem;
      color: var(--text-dim);
    }

    .footer-status-indicator {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      font-family: var(--font-mono);
      font-size: 0.72rem;
      color: #10b981;
    }

    .footer-status-dot {
      width: 7px;
      height: 7px;
      background: #10b981;
      border-radius: 50%;
      box-shadow: 0 0 8px #10b981;
    }

    .back-to-top-link {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      font-family: var(--font-mono);
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--primary);
      text-decoration: none;
      background: var(--bg-elevated);
      padding: 0.35rem 0.8rem;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-main);
      transition: all 0.2s ease;
    }

    .back-to-top-link:hover {
      background: var(--primary);
      color: white;
      transform: translateY(-2px);
    }
  </style>
</head>
<body>

  <!-- Top Real-time Reading Progress Bar -->
  <div class="progress-bar-container">
    <div id="progressBar" class="progress-bar-fill"></div>
  </div>

  <!-- Sticky Glassmorphic Header -->
  <header class="sticky-header">
    <div class="nav-left">
      <a href="#cover" class="brand-mark" onclick="returnToStart(event)">
        <span class="brand-badge">DIGEST</span>
        <span class="brand-title">
          <span class="brand-title-text">${escapeHtml(issue.title)}</span>
          <span class="brand-issue-pill">${escapeHtml(issue.issueNo)}</span>
        </span>
      </a>
    </div>

    <div class="nav-controls">
      <!-- Mode Toggle: StPageFlip vs Continuous Scroll Reader -->
      <div class="mode-toggle-group" title="Switch Reading Experience">
        <button onclick="setReaderMode('flip')" class="mode-btn active" id="modeFlipBtn" title="3D Page-Flip Mode">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
          <span class="nav-btn-label">Page-Flip</span>
        </button>
        <button onclick="setReaderMode('scroll')" class="mode-btn" id="modeScrollBtn" title="Continuous Scroll Mode">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
          <span class="nav-btn-label">Scroll</span>
        </button>
      </div>

      <!-- Table of Contents Drawer Trigger -->
      <button onclick="toggleTocDrawer()" class="control-btn" title="Open Table of Contents (T)">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
        <span class="nav-btn-label">Contents</span>
      </button>

      <!-- Font Size Toggle -->
      <button onclick="cycleFontSize()" class="control-btn control-icon-btn" title="Change font size" id="fontBtn">
        <span style="font-family: var(--font-prose); font-weight: bold; font-size: 0.95rem;">A+</span>
      </button>

      <!-- Theme Switcher (Dark / Light / Sepia) -->
      <button onclick="cycleTheme()" class="control-btn control-icon-btn" title="Toggle Theme (Dark / Light / Sepia)" id="themeBtn">
        <svg id="themeIcon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="4"></circle>
          <path d="M12 2v2"></path><path d="M12 20v2"></path>
          <path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path>
          <path d="M2 12h2"></path><path d="M20 12h2"></path>
          <path d="m6.34 17.66-1.41 1.41"></path><path d="m19.07 4.93-1.41 1.41"></path>
        </svg>
      </button>

      <!-- Share Link -->
      <button onclick="shareMagazine()" class="control-btn control-icon-btn" title="Share Edition">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
      </button>

      <!-- Print / Export PDF -->
      <button onclick="window.print()" class="control-btn control-icon-btn print-btn" title="Print / Save PDF (P)">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect width="12" height="8" x="6" y="14"></rect></svg>
      </button>
    </div>
  </header>

  <!-- ========================================================================= -->
  <!-- 1. StPageFlip OFFICIAL 3D PAGE FLIPPER VIEWPORT                           -->
  <!-- ========================================================================= -->
  <section class="stpageflip-container" id="stPageFlipSection">
    <div class="stpageflip-stage-wrapper">
      <button class="side-nav-arrow prev" onclick="flipPrev()" title="Previous Page (Left Arrow)">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
      </button>

      <div id="book">
        ${stPagesHtml}
      </div>

      <button class="side-nav-arrow next" onclick="flipNext()" title="Next Page (Right Arrow)">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
      </button>
    </div>

    <!-- StPageFlip Bottom Floating Control Dock -->
    <div class="dock-bar">
      <button class="dock-btn dock-btn-secondary" onclick="goToFlipPage(0)" title="First Page / Cover">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="19 20 9 12 19 4 19 20"></polygon><line x1="5" y1="19" x2="5" y2="5"></line></svg>
      </button>
      <button class="dock-btn" onclick="flipPrev()" title="Previous Page">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
      </button>

      <div class="dock-page-display">
        <span id="dockCurrentDisplay">1</span>
        <span style="opacity:0.5;">/</span>
        <span id="dockTotalDisplay">${stPages.length}</span>
      </div>

      <button class="dock-btn" onclick="flipNext()" title="Next Page">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
      </button>
      <button class="dock-btn dock-btn-secondary" onclick="goToFlipPage(${stPages.length - 1})" title="Last Page / Back Cover">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 4 15 12 5 20 5 4"></polygon><line x1="19" y1="5" x2="19" y2="19"></line></svg>
      </button>

      <div class="dock-divider"></div>

      <!-- Page Audio Sound Toggle -->
      <button class="dock-btn" onclick="toggleAudio()" id="soundBtn" title="Toggle Page Turn Sound">
        <svg id="soundIcon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path></svg>
      </button>

      <!-- Fullscreen Toggle -->
      <button class="dock-btn" onclick="toggleFullscreen()" title="Toggle Fullscreen (F)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>
      </button>
    </div>
  </section>

  <!-- ========================================================================= -->
  <!-- 2. CONTINUOUS SCROLL MODE VIEWPORT (FIXED SCROLLVIEW)                     -->
  <!-- ========================================================================= -->
  <main class="magazine-scroll-wrapper" id="scrollSection">
    <!-- Cover Section -->
    <section id="cover" class="cover-hero-card">
      <div class="cover-masthead">
        <div class="masthead-eyebrow">
          <div class="org-banner">${escapeHtml(hospitalName)}</div>
          <div class="edition-tag">${issueDateStr}</div>
        </div>

        <h1 class="cover-title">${escapeHtml(issue.title)}</h1>
        <p class="cover-description">${escapeHtml(issue.description || hospitalTagline)}</p>

        <div class="cover-meta-bar">
          <div class="meta-stat">
            <span class="meta-stat-label">Reference ID</span>
            <span class="meta-stat-value font-mono">${escapeHtml(issue.issueNo)}</span>
          </div>
          <div class="meta-stat">
            <span class="meta-stat-label">Published</span>
            <span class="meta-stat-value">${issueDateStr}</span>
          </div>
          <div class="meta-stat">
            <span class="meta-stat-label">Total Articles</span>
            <span class="meta-stat-value">${sections.length} Stories</span>
          </div>
          <div class="meta-stat">
            <span class="meta-stat-label">Estimated Read</span>
            <span class="meta-stat-value">${totalMinutes} Minutes</span>
          </div>

          <div class="cover-actions">
            ${sections.length > 0 ? `
              <button onclick="setReaderMode('flip')" class="primary-action-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
                <span>Read in 3D Page-Flip Mode</span>
              </button>
            ` : ""}
          </div>
        </div>
      </div>

      ${issue.coverImageUrl ? `
        <div class="cover-image-container">
          <img src="${escapeHtml(issue.coverImageUrl)}" alt="Cover: ${escapeHtml(issue.title)}" loading="eager">
        </div>
      ` : ""}
    </section>

    <!-- Table of Contents Card -->
    ${sections.length > 0 ? `
      <section id="toc" class="toc-section">
        <div class="toc-section-header">
          <h2 class="toc-section-title">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
            Table of Contents
          </h2>
          <span class="brand-issue-pill">${sections.length} Stories</span>
        </div>

        <div class="toc-grid">
          ${tocItemsHtml}
        </div>
      </section>
    ` : ""}

    <!-- Articles & Stories -->
    <div class="stories-container">
      ${scrollSectionsHtml}
    </div>
  </main>

  <!-- Slide-over Table of Contents Drawer -->
  <div id="drawerOverlay" class="drawer-overlay" onclick="closeTocDrawer()"></div>
  <aside id="tocDrawer" class="toc-drawer" aria-label="Table of Contents Drawer">
    <div class="drawer-header" style="display:flex; justify-content:space-between; padding: 1.5rem; align-items:center; border-bottom: 1px solid var(--border-main);">
      <h3 class="drawer-title" style="font-family: var(--font-display); font-size: 1.25rem;">Contents</h3>
      <button onclick="closeTocDrawer()" class="control-btn control-icon-btn" title="Close">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
    </div>
    <div class="drawer-body" style="padding: 1.25rem 1.5rem 1.5rem; overflow-y:auto; flex:1;">
      ${tocItemsHtml}
    </div>
  </aside>

  <!-- Toast Notification -->
  <div id="toast" class="toast-msg">Link copied to clipboard</div>

  <!-- Luxury Editorial Footer -->
  <footer class="site-footer">
    <div class="footer-inner-container">
      <div class="footer-main-grid">
        <!-- Col 1: Brand & Institutional Identity -->
        <div class="footer-col">
          <div class="footer-brand-badge">ACME HEALTHCARE</div>
          <div class="footer-hospital-title">${escapeHtml(hospitalName)}</div>
          <p class="footer-hospital-tagline">${escapeHtml(hospitalTagline)}</p>
          <div class="footer-meta-pill">${escapeHtml(issue.issueNo)} &bull; ${issueDateStr}</div>
        </div>

        <!-- Col 2: Navigation & Quick Jump -->
        <div class="footer-col">
          <div class="footer-col-title">Navigation</div>
          <ul class="footer-links-list">
            <li>
              <button onclick="toggleTocDrawer()" class="footer-link-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
                <span>Table of Contents</span>
              </button>
            </li>
            <li>
              <a href="#cover" class="footer-link-item" onclick="returnToStart(event)">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                <span>Front Cover</span>
              </a>
            </li>
            <li>
              <button onclick="setReaderMode('flip')" class="footer-link-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
                <span>StPageFlip Experience</span>
              </button>
            </li>
            <li>
              <button onclick="setReaderMode('scroll')" class="footer-link-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line></svg>
                <span>Continuous Scroll Mode</span>
              </button>
            </li>
            <li>
              <button onclick="window.print()" class="footer-link-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect width="12" height="8" x="6" y="14"></rect></svg>
                <span>Print / Save PDF</span>
              </button>
            </li>
          </ul>
        </div>

        <!-- Col 3: Coordinates & Clinical Helplines -->
        <div class="footer-col">
          <div class="footer-col-title">Campus & Emergency</div>
          <div class="footer-contact-list">
            <div class="footer-contact-item emergency">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
              <span>Emergency 24/7: ${escapeHtml(hospitalEmergency)}</span>
            </div>
            <div class="footer-contact-item">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              <span>OPD Desk: ${escapeHtml(hospitalOpd)}</span>
            </div>
            <div class="footer-contact-item">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"></rect><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path></svg>
              <span>${escapeHtml(hospitalEmail)}</span>
            </div>
            <div class="footer-contact-item">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path><circle cx="12" cy="10" r="3"></circle></svg>
              <span>${escapeHtml(hospitalAddress)}</span>
            </div>
          </div>
        </div>

        <!-- Col 4: Editorial Standards & Disclaimer -->
        <div class="footer-col">
          <div class="footer-col-title">Editorial Standards</div>
          <p class="footer-disclaimer-text">
            Articles in <em>${escapeHtml(issue.title)}</em> are compiled by clinical staff and research faculty for medical education and clinical updates.
          </p>
          <p class="footer-disclaimer-text" style="margin-top: 0.25rem;">
            ${escapeHtml(hospitalDivision)}
          </p>
        </div>
      </div>

      <!-- Bottom Sub-bar -->
      <div class="footer-bottom-bar">
        <div>
          &copy; ${new Date().getFullYear()} ${escapeHtml(hospitalName)}. ${escapeHtml(hospitalCopyright)}
        </div>
        <div style="display: flex; align-items: center; gap: 1.25rem;">
          <div class="footer-status-indicator">
            <span class="footer-status-dot"></span>
            <span>Digital Press Active</span>
          </div>
          <a href="#cover" class="back-to-top-link" onclick="returnToStart(event)">
            <span>↑ Top</span>
          </a>
        </div>
      </div>
    </div>
  </footer>

  <!-- ========================================================================= -->
  <!-- StPageFlip OFFICIAL LIBRARY ENGINE & SCRIPT                               -->
  <!-- ========================================================================= -->
  <script>
    let pageFlipInstance = null;
    let soundEnabled = true;
    let audioCtx = null;

    // 1. Reading Progress Bar (Scroll Mode)
    window.addEventListener('scroll', () => {
      if (document.documentElement.getAttribute('data-mode') !== 'scroll') return;
      const winScroll = document.documentElement.scrollTop || document.body.scrollTop;
      const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const scrolled = height > 0 ? (winScroll / height) * 100 : 0;
      const pBar = document.getElementById('progressBar');
      if (pBar) pBar.style.width = scrolled + '%';
    });

    // 2. Active Section Highlight in Scroll Mode
    if ('IntersectionObserver' in window) {
      const sectionObserver = new IntersectionObserver((entries) => {
        if (document.documentElement.getAttribute('data-mode') !== 'scroll') return;
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute('id');
            if (id) {
              document.querySelectorAll('.toc-card').forEach(card => {
                if (card.getAttribute('data-section') === id) {
                  card.classList.add('active-reading');
                } else {
                  card.classList.remove('active-reading');
                }
              });
            }
          }
        });
      }, { rootMargin: '-20% 0px -70% 0px' });

      document.querySelectorAll('.story-article').forEach(art => sectionObserver.observe(art));
    }

    // 3. Realistic Page Turn Audio
    function playPageTurnAudio() {
      if (!soundEnabled) return;
      try {
        if (!audioCtx) {
          audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
          audioCtx.resume();
        }

        const bufferSize = audioCtx.sampleRate * 0.12;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.35));
        }

        const noise = audioCtx.createBufferSource();
        noise.buffer = buffer;

        const filter = audioCtx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 1100;
        filter.Q.value = 1.3;

        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0.35, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(audioCtx.destination);

        noise.start();
      } catch (err) {}
    }

    function toggleAudio() {
      soundEnabled = !soundEnabled;
      const soundIcon = document.getElementById('soundIcon');
      if (soundEnabled) {
        soundIcon.innerHTML = '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>';
        showToast('Page sound ON');
      } else {
        soundIcon.innerHTML = '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line>';
        showToast('Page sound MUTED');
      }
    }

    // 4. StPageFlip Dynamic Aspect-Ratio & Dimension Calculator
    function getFlipbookDimensions() {
      const winW = window.innerWidth;
      const winH = window.innerHeight;
      const isPortrait = winW < 800;
      const headerH = winW < 640 ? 48 : 52;
      const dockH = winW < 520 ? 52 : 62;
      const stageAvailH = Math.max(340, winH - headerH - dockH);
      const stageAvailW = isPortrait ? Math.max(280, winW - 16) : Math.max(560, Math.min(winW - 32, 1150));

      const targetRatio = 1.36; // height / width for a single page

      let bookW, bookH;
      if (isPortrait) {
        // Single page portrait mode
        bookW = Math.min(stageAvailW, 520);
        bookH = Math.min(stageAvailH, Math.round(bookW * targetRatio));
        if (bookH > stageAvailH) {
          bookH = stageAvailH;
          bookW = Math.round(bookH / targetRatio);
        }
      } else {
        // 2-page spread landscape mode
        const maxSinglePageW = Math.floor(stageAvailW / 2);
        bookH = Math.min(stageAvailH, 740);
        bookW = Math.min(maxSinglePageW, Math.round(bookH / targetRatio));
        if (bookW * 2 > stageAvailW) {
          bookW = Math.floor(stageAvailW / 2);
          bookH = Math.round(bookW * targetRatio);
        }
      }

      return {
        width: Math.max(260, bookW),
        height: Math.max(360, bookH),
        isPortrait: isPortrait
      };
    }

    function initStPageFlip() {
      const flipContainer = document.getElementById('book');
      if (!flipContainer) return;
      if (!window.St || !window.St.PageFlip) {
        setTimeout(initStPageFlip, 150);
        return;
      }

      if (pageFlipInstance) {
        try { pageFlipInstance.destroy(); } catch (e) {}
        pageFlipInstance = null;
      }

      const dims = getFlipbookDimensions();

      pageFlipInstance = new St.PageFlip(flipContainer, {
        width: dims.width,
        height: dims.height,
        size: 'stretch',
        minWidth: 260,
        maxWidth: 800,
        minHeight: 360,
        maxHeight: 1200,
        maxShadowOpacity: 0.55,
        showCover: true,
        mobileScrollSupport: true,
        useMouseEvents: true,
        swipeDistance: 20,
        clickEventForward: true,
        drawShadow: true,
        flippingTime: 600,
        usePortrait: dims.isPortrait,
        startPage: 0
      });

      const pages = flipContainer.querySelectorAll('.page');
      pageFlipInstance.loadFromHTML(pages);

      pageFlipInstance.on('flip', (e) => {
        playPageTurnAudio();
        const currentIdx = e.data;
        const total = pageFlipInstance.getPageCount();
        const displayElem = document.getElementById('dockCurrentDisplay');
        if (displayElem) {
          displayElem.innerText = (currentIdx + 1) + ' / ' + total;
        }
      });

      pageFlipInstance.on('init', () => {
        const total = pageFlipInstance.getPageCount();
        const totalElem = document.getElementById('dockTotalDisplay');
        if (totalElem) totalElem.innerText = total;
        const displayElem = document.getElementById('dockCurrentDisplay');
        if (displayElem) displayElem.innerText = '1 / ' + total;
      });
    }

    function flipNext() {
      if (pageFlipInstance) pageFlipInstance.flipNext();
    }

    function flipPrev() {
      if (pageFlipInstance) pageFlipInstance.flipPrev();
    }

    function goToFlipPage(idx) {
      closeTocDrawer();
      if (pageFlipInstance) {
        pageFlipInstance.turnToPage(idx);
      }
    }

    // 5. Reader Mode Switcher
    function setReaderMode(mode) {
      document.documentElement.setAttribute('data-mode', mode);
      localStorage.setItem('magazine-reader-mode', mode);

      const flipBtn = document.getElementById('modeFlipBtn');
      const scrollBtn = document.getElementById('modeScrollBtn');

      if (mode === 'flip') {
        flipBtn.classList.add('active');
        scrollBtn.classList.remove('active');
        setTimeout(initStPageFlip, 50);
      } else {
        scrollBtn.classList.add('active');
        flipBtn.classList.remove('active');
      }
      showToast('Switched to ' + (mode === 'flip' ? '3D PAGE-FLIP' : 'SCROLL') + ' mode');
    }

    // 6. TOC Navigation (Handles both StPageFlip and Scroll Modes)
    function handleTocClick(anchorId, pageIdx, event) {
      closeTocDrawer();
      const currentMode = document.documentElement.getAttribute('data-mode');
      if (currentMode === 'flip') {
        if (event) event.preventDefault();
        goToFlipPage(pageIdx);
      } else {
        if (event) event.preventDefault();
        const target = document.getElementById(anchorId);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          history.replaceState(null, '', '#' + anchorId);
        }
      }
    }

    function returnToStart(e) {
      const currentMode = document.documentElement.getAttribute('data-mode');
      if (currentMode === 'flip') {
        e.preventDefault();
        goToFlipPage(0);
      }
    }

    // 7. Theme Switcher
    const themes = ['dark', 'light', 'sepia'];
    const savedTheme = localStorage.getItem('magazine-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);

    function cycleTheme() {
      const current = document.documentElement.getAttribute('data-theme') || 'dark';
      const nextIndex = (themes.indexOf(current) + 1) % themes.length;
      const nextTheme = themes[nextIndex];
      document.documentElement.setAttribute('data-theme', nextTheme);
      localStorage.setItem('magazine-theme', nextTheme);
      updateThemeIcon(nextTheme);
      showToast('Theme: ' + nextTheme.toUpperCase());
    }

    function updateThemeIcon(theme) {
      const icon = document.getElementById('themeIcon');
      if (!icon) return;
      if (theme === 'dark') {
        icon.innerHTML = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>';
      } else if (theme === 'light') {
        icon.innerHTML = '<circle cx="12" cy="12" r="4"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m6.34 17.66-1.41 1.41"></path><path d="m19.07 4.93-1.41 1.41"></path>';
      } else {
        icon.innerHTML = '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>';
      }
    }

    // 8. Font Scaling
    const fontSizes = ['small', 'normal', 'large'];
    const savedFont = localStorage.getItem('magazine-font') || 'normal';
    document.documentElement.setAttribute('data-font', savedFont);

    function cycleFontSize() {
      const current = document.documentElement.getAttribute('data-font') || 'normal';
      const nextIndex = (fontSizes.indexOf(current) + 1) % fontSizes.length;
      const nextFont = fontSizes[nextIndex];
      document.documentElement.setAttribute('data-font', nextFont);
      localStorage.setItem('magazine-font', nextFont);
      showToast('Font size: ' + nextFont.toUpperCase());
    }

    // 9. Drawer Toggle
    function toggleTocDrawer() {
      document.getElementById('drawerOverlay').classList.toggle('open');
      document.getElementById('tocDrawer').classList.toggle('open');
    }

    function closeTocDrawer() {
      document.getElementById('drawerOverlay').classList.remove('open');
      document.getElementById('tocDrawer').classList.remove('open');
    }

    // 10. Toast
    function showToast(msg) {
      const toast = document.getElementById('toast');
      toast.innerText = msg;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 2400);
    }

    // 11. Share
    async function shareMagazine() {
      const url = window.location.href;
      if (navigator.share) {
        try {
          await navigator.share({
            title: '${escapeHtml(issue.title)}',
            text: '${escapeHtml(issue.description || `${issue.title} — ${issueDateStr}`)}',
            url: url
          });
          return;
        } catch (err) {}
      }
      navigator.clipboard.writeText(url);
      showToast('Link copied to clipboard!');
    }

    // 12. Fullscreen
    function toggleFullscreen() {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    }

    // 13. Keyboard Navigation
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        flipNext();
      }
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        flipPrev();
      }
      if (e.key === 't' || e.key === 'T') toggleTocDrawer();
      if (e.key === 'f' || e.key === 'F') toggleFullscreen();
      if (e.key === 'Escape') closeTocDrawer();
    });

    // Auto-init on load
    window.addEventListener('DOMContentLoaded', () => {
      const savedMode = localStorage.getItem('magazine-reader-mode') || 'flip';
      setReaderMode(savedMode);
    });

    // Debounced resize & orientation change handler
    let resizeTimer = null;
    function handleWindowResize() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (document.documentElement.getAttribute('data-mode') === 'flip') {
          initStPageFlip();
        }
      }, 150);
    }

    window.addEventListener('resize', handleWindowResize);
    window.addEventListener('orientationchange', handleWindowResize);
  </script>
</body>
</html>`;
}
