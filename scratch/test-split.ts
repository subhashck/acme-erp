import { db } from "../server/db/client.ts";
import { magazineIssues, magazineSections } from "../server/db/schema-magazine.ts";
import { eq } from "drizzle-orm";

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").trim();
}

function splitHtmlIntoMagazinePages(html: string): string[] {
  if (!html || !html.trim()) {
    return ['<p class="empty-note">Story content is being compiled.</p>'];
  }

  const blockRegex = /(<(?:p|blockquote|h[1-6]|ul|ol|figure|div|pre|table|hr)[^>]*>[\s\S]*?<\/(?:p|blockquote|h[1-6]|ul|ol|figure|div|pre|table|hr)>|<(?:img|hr)[^>]*\/?>)/gi;
  let rawBlocks = html.match(blockRegex) || [];
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

  // Lead page capacity ~420, continuation page capacity ~680
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

  return pages;
}

async function run() {
  const [issue] = await db.select().from(magazineIssues).where(eq(magazineIssues.slug, "august-2026")).limit(1);
  const sections = await db.select().from(magazineSections).where(eq(magazineSections.issueId, issue.id));
  
  let totalPages = 2; // cover + inside cover
  sections.forEach((s) => {
    const p = splitHtmlIntoMagazinePages(s.contentHtml);
    console.log(`"${s.title}" -> ${p.length} pages (Length: ${s.contentHtml.length})`);
    totalPages += p.length;
  });
  totalPages += 1; // back cover
  console.log("Total Flipbook Book Pages:", totalPages);
  process.exit(0);
}

run();
