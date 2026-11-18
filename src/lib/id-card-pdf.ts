import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import type { IdCardTemplate, IdCardLayoutConfig } from "../../server/db/schema-idcards";
import { formatDateDdMonYyyy } from "../utils/format";

export { formatDateDdMonYyyy };

export interface CardRenderData {
  entityId?: number;
  cardSerialNo: string;
  name: string;
  code: string;
  department?: string | null;
  role?: string | null;
  bloodGroup?: string | null;
  emergencyContact?: string | null;
  secondaryContact?: string | null;
  photoUrl?: string | null;
  issueDate?: string | null;
  validUntil?: string | null;
  qrVerifyToken?: string | null;
  entityType?: "staff" | "student";
  // Student template specific fields
  fatherName?: string | null;
  fatherDeceased?: boolean | null;
  motherName?: string | null;
  dob?: string | null;
  address?: string | null;
  academicYear?: string | null;
  frontPngData?: string | null;
  backPngData?: string | null;
}

// CR80 Standard dimensions in millimeters
export const CR80_WIDTH = 85.6;
export const CR80_HEIGHT = 53.98;

// Convert Hex color to RGB
function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const num = parseInt(clean, 16);
  if (isNaN(num)) return [2, 132, 199];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

// Generate QR Code data URL
async function generateQrDataUrl(text: string): Promise<string | null> {
  try {
    return await QRCode.toDataURL(text, {
      margin: 1,
      width: 256,
      color: { dark: "#000000", light: "#ffffff" },
    });
  } catch (err) {
    console.error("Failed to generate QR code", err);
    return null;
  }
}

// Code 128B barcode generator (encodes ASCII text into pattern of bar widths)
function getCode128Pattern(text: string): number[] {
  // Code 128B patterns: each number represents bar/space widths (1 to 4 units)
  const patterns: { [code: number]: number[] } = {
    0: [2, 1, 2, 2, 2, 2], 1: [2, 2, 2, 1, 2, 2], 2: [2, 2, 2, 2, 2, 1],
    3: [1, 2, 1, 2, 2, 3], 4: [1, 2, 1, 3, 2, 2], 5: [1, 3, 1, 2, 2, 2],
    6: [1, 2, 2, 2, 1, 3], 7: [1, 2, 2, 3, 1, 2], 8: [1, 3, 2, 2, 1, 2],
    9: [2, 2, 1, 2, 1, 3], 10: [2, 2, 1, 3, 1, 2], 11: [2, 3, 1, 2, 1, 2],
    12: [1, 1, 2, 2, 3, 2], 13: [1, 2, 2, 1, 3, 2], 14: [1, 2, 2, 2, 3, 1],
    15: [1, 1, 3, 2, 2, 2], 16: [1, 2, 3, 1, 2, 2], 17: [1, 2, 3, 2, 2, 1],
    18: [2, 2, 3, 2, 1, 1], 19: [2, 2, 1, 1, 3, 2], 20: [2, 2, 1, 2, 3, 1],
    21: [2, 1, 3, 2, 1, 2], 22: [2, 2, 3, 1, 1, 2], 23: [3, 1, 2, 1, 3, 1],
    24: [3, 1, 1, 2, 2, 2], 25: [3, 2, 1, 1, 2, 2], 26: [3, 2, 1, 2, 2, 1],
    27: [3, 1, 2, 2, 1, 2], 28: [3, 2, 2, 1, 1, 2], 29: [3, 2, 2, 2, 1, 1],
    30: [2, 1, 2, 1, 2, 3], 31: [2, 1, 2, 3, 2, 1], 32: [2, 3, 2, 1, 2, 1],
    33: [1, 1, 1, 3, 2, 3], 34: [1, 3, 1, 1, 2, 3], 35: [1, 3, 1, 3, 2, 1],
    36: [1, 1, 2, 3, 1, 3], 37: [1, 3, 2, 1, 1, 3], 38: [1, 3, 2, 3, 1, 1],
    39: [2, 1, 1, 3, 1, 3], 40: [2, 3, 1, 1, 1, 3], 41: [2, 3, 1, 3, 1, 1],
    42: [1, 1, 2, 1, 3, 3], 43: [1, 1, 2, 3, 3, 1], 44: [1, 3, 2, 1, 3, 1],
    45: [1, 1, 3, 1, 2, 3], 46: [1, 1, 3, 3, 2, 1], 47: [1, 3, 3, 1, 2, 1],
    48: [3, 1, 3, 1, 2, 1], 49: [2, 1, 1, 3, 3, 1], 50: [2, 3, 1, 1, 3, 1],
    51: [2, 1, 3, 1, 1, 3], 52: [2, 1, 3, 3, 1, 1], 53: [2, 1, 3, 1, 3, 1],
    54: [3, 1, 1, 1, 2, 3], 55: [3, 1, 1, 3, 2, 1], 56: [3, 3, 1, 1, 2, 1],
    57: [3, 1, 2, 1, 1, 3], 58: [3, 1, 2, 3, 1, 1], 59: [3, 3, 2, 1, 1, 1],
    60: [3, 1, 4, 1, 1, 1], 61: [2, 2, 1, 4, 1, 1], 62: [4, 3, 1, 1, 1, 1],
    63: [1, 1, 1, 2, 2, 4], 64: [1, 1, 1, 4, 2, 2], 65: [1, 2, 1, 1, 2, 4],
    66: [1, 2, 1, 4, 2, 1], 67: [1, 4, 1, 1, 2, 2], 68: [1, 4, 1, 2, 2, 1],
    69: [1, 1, 2, 2, 1, 4], 70: [1, 1, 2, 4, 1, 2], 71: [1, 2, 2, 1, 1, 4],
    72: [1, 2, 2, 4, 1, 1], 73: [1, 4, 2, 1, 1, 2], 74: [1, 4, 2, 2, 1, 1],
    75: [2, 4, 1, 2, 1, 1], 76: [2, 2, 1, 1, 1, 4], 77: [4, 1, 3, 1, 1, 1],
    78: [2, 4, 1, 1, 1, 2], 79: [1, 3, 4, 1, 1, 1], 80: [1, 1, 1, 2, 4, 2],
    81: [1, 2, 1, 1, 4, 2], 82: [1, 2, 1, 2, 4, 1], 83: [1, 1, 4, 2, 1, 2],
    84: [1, 2, 4, 1, 1, 2], 85: [1, 2, 4, 2, 1, 1], 86: [4, 1, 1, 2, 1, 2],
    87: [4, 2, 1, 1, 1, 2], 88: [4, 2, 1, 2, 1, 1], 89: [2, 1, 2, 1, 4, 1],
    90: [2, 1, 4, 1, 2, 1], 91: [4, 1, 2, 1, 2, 1], 92: [1, 1, 1, 1, 4, 3],
    93: [1, 1, 1, 3, 4, 1], 94: [1, 3, 1, 1, 4, 1], 95: [1, 1, 4, 1, 1, 3],
    96: [1, 1, 4, 3, 1, 1], 97: [4, 1, 1, 1, 1, 3], 98: [4, 1, 1, 3, 1, 1],
    99: [1, 1, 3, 1, 4, 1], 100: [1, 1, 4, 1, 3, 1], 101: [3, 1, 1, 1, 4, 1],
    102: [4, 1, 1, 1, 3, 1], 103: [2, 1, 1, 4, 1, 2], 104: [2, 1, 1, 2, 1, 4], // Start B
    105: [2, 1, 1, 2, 3, 2], 106: [2, 3, 3, 1, 1, 1, 2], // Stop
  };

  const codes: number[] = [104]; // Start B
  let checkSum = 104;

  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i) - 32;
    const validCode = charCode >= 0 && charCode <= 95 ? charCode : 0;
    codes.push(validCode);
    checkSum += validCode * (i + 1);
  }

  codes.push(checkSum % 103);
  codes.push(106); // Stop

  const barSequence: number[] = [];
  for (const c of codes) {
    const pat = patterns[c] || patterns[0];
    barSequence.push(...pat);
  }

  return barSequence;
}

// Draw vector Code128 barcode directly in PDF
function drawBarcode(doc: jsPDF, text: string, x: number, y: number, targetWidth: number, targetHeight: number) {
  const pattern = getCode128Pattern(text);
  const totalUnits = pattern.reduce((a, b) => a + b, 0);
  const unitWidth = targetWidth / totalUnits;

  let currentX = x;
  let isBar = true;

  doc.setFillColor(0, 0, 0);
  for (const widthUnits of pattern) {
    const barWidth = widthUnits * unitWidth;
    if (isBar) {
      doc.rect(currentX, y, barWidth, targetHeight, "F");
    }
    currentX += barWidth;
    isBar = !isBar;
  }
}

// Convert image URL to base64 Data URL safely
async function loadImageDataUrl(url: string): Promise<string | null> {
  if (!url) return null;
  if (url.startsWith("data:")) return url;

  if (typeof window === "undefined" && url.startsWith("/")) {
    try {
      // In Node.js testing environments, resolve from public directory
      const req = (mod: string) => (0, eval)("require")(mod);
      const nodeFs = req("fs");
      const nodePath = req("path");
      const filePath = nodePath.join(process.cwd(), "public", url);
      if (nodeFs.existsSync(filePath)) {
        const buffer = nodeFs.readFileSync(filePath);
        const ext = nodePath.extname(filePath).replace(".", "").toLowerCase();
        const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : ext === "png" ? "image/png" : "image/webp";
        return `data:${mime};base64,${buffer.toString("base64")}`;
      }
    } catch {}
  }

  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const blob = await resp.blob();
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

/**
 * Render Official ACON Student ID Card Front (Portrait)
 * Uses exclusively the background template image with dynamic student data overlays
 */
async function renderAconStudentCardFront(
  doc: jsPDF,
  card: CardRenderData,
  config: IdCardLayoutConfig,
  originX: number,
  originY: number
) {
  const w = CR80_HEIGHT; // 53.98 mm
  const h = CR80_WIDTH; // 85.60 mm
  const centerX = originX + w / 2;

  // 1. Draw Background Image
  const frontBgUrl = config.background?.frontImageUrl || "/templates/acon-student-front.jpg";
  const bgData = await loadImageDataUrl(frontBgUrl);
  if (bgData) {
    try {
      doc.addImage(bgData, "JPEG", originX, originY, w, h);
    } catch {
      try {
        doc.addImage(bgData, "PNG", originX, originY, w, h);
      } catch {}
    }
  }

  // 2. Circular Photo with White Ring Border
  const photoRadius = 9.5;
  const photoCenterX = config.positions?.photo?.x != null
    ? originX + (config.positions.photo.x / 100) * w
    : centerX;
  const photoCenterY = config.positions?.photo?.y != null
    ? originY + (config.positions.photo.y / 100) * h
    : originY + 28.5;

  // Background white circle for photo
  doc.setFillColor(255, 255, 255);
  doc.circle(photoCenterX, photoCenterY, photoRadius + 0.8, "F");

  // Draw Photo (loads generic avatar placeholder if no photoUrl provided)
  let hasDrawnPhoto = false;
  const photoToLoad = card.photoUrl || "/templates/generic-avatar.png";
  const photoData = await loadImageDataUrl(photoToLoad);
  if (photoData) {
    try {
      doc.addImage(
        photoData,
        "PNG",
        photoCenterX - photoRadius,
        photoCenterY - photoRadius,
        photoRadius * 2,
        photoRadius * 2
      );
      hasDrawnPhoto = true;
    } catch (e) {
      try {
        doc.addImage(
          photoData,
          "JPEG",
          photoCenterX - photoRadius,
          photoCenterY - photoRadius,
          photoRadius * 2,
          photoRadius * 2
        );
        hasDrawnPhoto = true;
      } catch {}
    }
  }

  if (!hasDrawnPhoto) {
    doc.setFillColor(241, 245, 249);
    doc.circle(photoCenterX, photoCenterY, photoRadius, "F");
    doc.setFillColor(148, 163, 184);
    doc.circle(photoCenterX, photoCenterY - 1.8, photoRadius * 0.38, "F");
  }

  // White crisp ring around photo
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.9);
  doc.circle(photoCenterX, photoCenterY, photoRadius, "S");

  // 3. Student Full Name (supports custom drag & drop position)
  const nameX = config.positions?.name?.x != null
    ? originX + (config.positions.name.x / 100) * w
    : centerX;
  const nameY = config.positions?.name?.y != null
    ? originY + (config.positions.name.y / 100) * h
    : originY + 47.5;

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text(card.name, nameX, nameY, { align: "center" });

  // 4. Detail Table (supports custom drag & drop position)
  let fieldY = config.positions?.details?.y != null
    ? originY + (config.positions.details.y / 100) * h
    : originY + 53.5;
  const labelX = config.positions?.details?.x != null
    ? originX + (config.positions.details.x / 100) * w
    : originX + 5.5;
  const colonX = labelX + 17;
  const valX = labelX + 19.5;

  const drawFieldRow = (label: string, value: string, isValBold = false) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.2);
    doc.setTextColor(255, 255, 255);
    doc.text(label, labelX, fieldY);
    doc.text(":", colonX, fieldY);
    if (isValBold) doc.setFont("helvetica", "bold");
    doc.text(value, valX, fieldY);
    fieldY += 3.3;
  };

  const batchValidity = card.academicYear || card.validUntil || card.department || "2024-2028";
  drawFieldRow("Validity", batchValidity, true);
  const dobFormatted = formatDateDdMonYyyy(card.dob) || "11-MAR-2006";
  drawFieldRow("Date of Birth", dobFormatted);
  drawFieldRow("Blood Group", card.bloodGroup || "A+ ve");
  drawFieldRow("Parent's No.", card.emergencyContact || "+91 8076 417 706");

  // 5. Authorized Signatory Designation & Signature (supports custom drag & drop position)
  if (config.signature?.enabled !== false) {
    const sigCenterX = config.positions?.signature?.x != null
      ? originX + (config.positions.signature.x / 100) * w
      : centerX;
    const sigCenterY = config.positions?.signature?.y != null
      ? originY + (config.positions.signature.y / 100) * h
      : originY + 76.5;

    // Draw signature image if present
    if (config.signature?.imageUrl) {
      const sigData = await loadImageDataUrl(config.signature.imageUrl);
      if (sigData) {
        try {
          doc.addImage(sigData, "PNG", sigCenterX - 11, sigCenterY - 6.5, 22, 5.5);
        } catch {}
      }
    } else {
      // Crisp white signature line
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(0.35);
      doc.line(sigCenterX - 14, sigCenterY - 1.2, sigCenterX + 14, sigCenterY - 1.2);
    }

    // Designation Label
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.2);
    const label = config.signature?.label || "Principal Signature";
    doc.text(label, sigCenterX, sigCenterY + 2.2, { align: "center" });
  }
}

/**
 * Render Official ACON Student ID Card Back (Portrait)
 * Uses exclusively the background template image with dynamic student data overlays
 */
async function renderAconStudentCardBack(
  doc: jsPDF,
  card: CardRenderData,
  config: IdCardLayoutConfig,
  originX: number,
  originY: number
) {
  const w = CR80_HEIGHT; // 53.98 mm
  const h = CR80_WIDTH; // 85.60 mm
  const centerX = originX + w / 2;

  // 1. Draw Background Image
  const backBgUrl = config.background?.backImageUrl || "/templates/acon-student-back.jpg";
  const bgData = await loadImageDataUrl(backBgUrl);
  if (bgData) {
    try {
      doc.addImage(bgData, "JPEG", originX, originY, w, h);
    } catch {
      try {
        doc.addImage(bgData, "PNG", originX, originY, w, h);
      } catch {}
    }
  }

  // 2. Top Info Block (Navy text, supports custom drag & drop position)
  let currY = config.positions?.backDetails?.y != null
    ? originY + (config.positions.backDetails.y / 100) * h
    : originY + 8.5;
  const labelX = config.positions?.backDetails?.x != null
    ? originX + (config.positions.backDetails.x / 100) * w
    : originX + 5;
  const colonX = labelX + 17.5;
  const valX = labelX + 20;

  const drawBackRow = (label: string, value: string) => {
    doc.setTextColor(33, 47, 96);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(5.2);
    doc.text(label, labelX, currY);
    doc.text(":", colonX, currY);
    const splitVal = doc.splitTextToSize(value, w - 28);
    doc.text(splitVal, valX, currY);
    currY += splitVal.length * 2.8 + 1.2;
  };

  drawBackRow("Father Name", card.fatherName || "(Late) L. Ibomacha Singh");
  drawBackRow("Mother Name", card.motherName || "Laikhuram (O) Bimola Devi");
  drawBackRow("Address", card.address || "Kongba Kshetri Leikai, Imphal East.");

  // 3. Dynamic QR Code (supports custom drag & drop position)
  const qrBoxSize = 16;
  const qrBoxX = config.positions?.qrCode?.x != null
    ? originX + (config.positions.qrCode.x / 100) * w - qrBoxSize / 2
    : centerX - qrBoxSize / 2;
  const qrBoxY = config.positions?.qrCode?.y != null
    ? originY + (config.positions.qrCode.y / 100) * h
    : originY + 31.5;

  const qrUrl = card.qrVerifyToken
    ? (typeof window !== "undefined"
        ? `${window.location.origin}/verify/id/${card.qrVerifyToken}`
        : `https://acmehospital.com/verify/id/${card.qrVerifyToken}`)
    : "https://maps.google.com/?q=Acme+College+of+Nursing+Imphal";

  const qrDataUrl = await generateQrDataUrl(qrUrl);
  if (qrDataUrl) {
    try {
      doc.addImage(qrDataUrl, "PNG", qrBoxX + 1, qrBoxY + 1, qrBoxSize - 2, qrBoxSize - 2);
    } catch {}
  }
}

/**
 * Render Front Side of a Card
 */
export async function renderCardFront(
  doc: jsPDF,
  card: CardRenderData,
  config: IdCardLayoutConfig,
  isLandscape: boolean,
  originX: number,
  originY: number
) {
  const isAconStudent =
    card.entityType === "student" || config.theme?.cardVariant === "acon-official-student";

  const effectiveLandscape = isAconStudent ? false : isLandscape;
  const w = effectiveLandscape ? CR80_WIDTH : CR80_HEIGHT;
  const h = effectiveLandscape ? CR80_HEIGHT : CR80_WIDTH;

  // Direct High-Res PNG Placement inside PDF
  if (card.frontPngData) {
    try {
      doc.addImage(card.frontPngData, "PNG", originX, originY, w, h);
      return;
    } catch (e) {
      console.warn("Failed to place frontPngData image inside PDF", e);
    }
  }

  if (isAconStudent) {
    return await renderAconStudentCardFront(doc, card, config, originX, originY);
  }

  const [primaryR, primaryG, primaryB] = hexToRgb(config.theme.primaryColor || "#0284c7");
  const [secondaryR, secondaryG, secondaryB] = hexToRgb(config.theme.secondaryColor || "#0f172a");

  // 1. Background
  doc.setFillColor(255, 255, 255);
  doc.rect(originX, originY, w, h, "F");

  // 2. Header Banner
  const headerHeight = isLandscape ? 14 : 17;
  doc.setFillColor(primaryR, primaryG, primaryB);
  doc.rect(originX, originY, w, headerHeight, "F");

  // Decorative stripe
  doc.setFillColor(secondaryR, secondaryG, secondaryB);
  doc.rect(originX, originY + headerHeight, w, 1.2, "F");

  // Header Title
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(isLandscape ? 8.5 : 8);
  doc.text(config.header.institutionTitle || "ACME HEALTHCARE", originX + w / 2, originY + 5.5, { align: "center" });

  if (config.header.institutionSubtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.5);
    doc.text(config.header.institutionSubtitle, originX + w / 2, originY + 9.5, { align: "center" });
  }

  if (config.header.affiliationText) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(4.8);
    doc.text(config.header.affiliationText, originX + w / 2, originY + 13, { align: "center" });
  }

  // 3. Photograph Frame
  let photoWidth = isLandscape ? 22 : 24;
  let photoHeight = isLandscape ? 27.5 : 30;
  let photoX = isLandscape ? originX + 6 : originX + (w - photoWidth) / 2;
  let photoY = isLandscape ? originY + headerHeight + 5 : originY + headerHeight + 3.5;

  // Draw Photo Frame Border
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(primaryR, primaryG, primaryB);
  doc.setLineWidth(0.4);
  doc.rect(photoX, photoY, photoWidth, photoHeight, "FD");

  // Load and draw photo (or generic placeholder)
  let hasDrawnPhoto = false;
  const staffPhotoToLoad = card.photoUrl || "/templates/generic-avatar.png";
  const photoData = await loadImageDataUrl(staffPhotoToLoad);
  if (photoData) {
    try {
      doc.addImage(photoData, "PNG", photoX + 0.3, photoY + 0.3, photoWidth - 0.6, photoHeight - 0.6);
      hasDrawnPhoto = true;
    } catch (e) {
      try {
        doc.addImage(photoData, "JPEG", photoX + 0.3, photoY + 0.3, photoWidth - 0.6, photoHeight - 0.6);
        hasDrawnPhoto = true;
      } catch {}
    }
  }

  // Default avatar silhouette if no photo loaded
  if (!hasDrawnPhoto) {
    doc.setFillColor(226, 232, 240);
    doc.rect(photoX + 0.3, photoY + 0.3, photoWidth - 0.6, photoHeight - 0.6, "F");
    doc.setFillColor(148, 163, 184);
    doc.circle(photoX + photoWidth / 2, photoY + photoHeight * 0.4, 4.5, "F");
  }

  // 4. Details / Typography
  if (isLandscape) {
    // Landscape text on the right side
    const textStartX = originX + 32;
    let currY = originY + headerHeight + 7;

    doc.setTextColor(secondaryR, secondaryG, secondaryB);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.text(card.name.toUpperCase(), textStartX, currY);

    currY += 4.5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(primaryR, primaryG, primaryB);
    doc.text(card.role || "Staff Member", textStartX, currY);

    currY += 4;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`ID / Code: ${card.code}`, textStartX, currY);

    if (card.department) {
      currY += 3.5;
      doc.text(`Dept: ${card.department}`, textStartX, currY);
    }

    // Barcode at bottom
    if (config.barcode.enabled) {
      drawBarcode(doc, card.code, textStartX, originY + h - 10, 36, 4.5);
      doc.setFontSize(5);
      doc.text(card.code, textStartX + 18, originY + h - 4.2, { align: "center" });
    }
  } else {
    // Portrait text centered below photo
    let currY = photoY + photoHeight + 4.5;

    doc.setTextColor(secondaryR, secondaryG, secondaryB);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(card.name.toUpperCase(), originX + w / 2, currY, { align: "center" });

    currY += 4;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(primaryR, primaryG, primaryB);
    doc.text(card.role || "Staff Member", originX + w / 2, currY, { align: "center" });

    currY += 3.8;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`${card.code}`, originX + w / 2, currY, { align: "center" });

    if (card.department) {
      currY += 3.2;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6);
      doc.text(card.department, originX + w / 2, currY, { align: "center" });
    }

    // Barcode at bottom of portrait card
    if (config.barcode.enabled) {
      const barcodeWidth = 36;
      const barcodeHeight = 4.5;
      const barX = originX + (w - barcodeWidth) / 2;
      const barY = originY + h - 11;
      drawBarcode(doc, card.code, barX, barY, barcodeWidth, barcodeHeight);
      doc.setFontSize(5);
      doc.setTextColor(71, 85, 105);
      doc.text(card.code, originX + w / 2, barY + barcodeHeight + 2.2, { align: "center" });
    }
  }

  // Bottom color accent line
  doc.setFillColor(primaryR, primaryG, primaryB);
  doc.rect(originX, originY + h - 1.5, w, 1.5, "F");
}

/**
 * Render Back Side of a Card
 */
export async function renderCardBack(
  doc: jsPDF,
  card: CardRenderData,
  config: IdCardLayoutConfig,
  isLandscape: boolean,
  originX: number,
  originY: number
) {
  const isAconStudent =
    card.entityType === "student" || config.theme?.cardVariant === "acon-official-student";

  const effectiveLandscape = isAconStudent ? false : isLandscape;
  const w = effectiveLandscape ? CR80_WIDTH : CR80_HEIGHT;
  const h = effectiveLandscape ? CR80_HEIGHT : CR80_WIDTH;

  // Direct High-Res PNG Placement inside PDF
  if (card.backPngData) {
    try {
      doc.addImage(card.backPngData, "PNG", originX, originY, w, h);
      return;
    } catch (e) {
      console.warn("Failed to place backPngData image inside PDF", e);
    }
  }

  if (isAconStudent) {
    return await renderAconStudentCardBack(doc, card, config, originX, originY);
  }

  const [primaryR, primaryG, primaryB] = hexToRgb(config.theme.primaryColor || "#0284c7");
  const [secondaryR, secondaryG, secondaryB] = hexToRgb(config.theme.secondaryColor || "#0f172a");

  // 1. Background
  doc.setFillColor(255, 255, 255);
  doc.rect(originX, originY, w, h, "F");

  // 2. Top Banner
  const topBannerHeight = 4;
  doc.setFillColor(secondaryR, secondaryG, secondaryB);
  doc.rect(originX, originY, w, topBannerHeight, "F");

  // 3. Information Fields
  let currY = originY + topBannerHeight + 5;
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(6);

  const drawRow = (label: string, value: string | undefined | null) => {
    if (!value) return;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(71, 85, 105);
    doc.text(`${label}:`, originX + 5, currY);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42);
    doc.text(value, originX + (isLandscape ? 28 : 24), currY);
    currY += 3.5;
  };

  if (card.bloodGroup) drawRow("Blood Group", card.bloodGroup);
  if (card.emergencyContact) drawRow("Emergency Contact", card.emergencyContact);
  if (card.issueDate) drawRow("Issue Date", formatDateDdMonYyyy(card.issueDate));
  if (card.validUntil) drawRow("Valid Until", formatDateDdMonYyyy(card.validUntil));
  drawRow("Card Serial", card.cardSerialNo);

  // 4. Terms of Use
  currY += 1.5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(4.5);
  doc.setTextColor(100, 116, 139);
  const terms = config.termsText || "This card is strictly non-transferable and remains property of ACME. Report loss immediately.";
  const splitTerms = doc.splitTextToSize(terms, w - 10);
  doc.text(splitTerms, originX + 5, currY);
  currY += splitTerms.length * 2.2 + 2;

  // 5. Verification QR Code & Authorized Signature
  const qrSize = isLandscape ? 16 : 17;
  const qrX = originX + 5;
  const qrY = originY + h - qrSize - 4;

  const verifyUrl = card.qrVerifyToken
    ? (typeof window !== "undefined"
        ? `${window.location.origin}/verify/id/${card.qrVerifyToken}`
        : `https://acmehospital.com/verify/id/${card.qrVerifyToken}`)
    : `https://acmehospital.com/verify/id/${card.cardSerialNo}`;

  const qrDataUrl = await generateQrDataUrl(verifyUrl);
  if (qrDataUrl) {
    try {
      doc.addImage(qrDataUrl, "PNG", qrX, qrY, qrSize, qrSize);
    } catch {}
  }

  // QR Label
  doc.setFont("helvetica", "normal");
  doc.setFontSize(4);
  doc.setTextColor(100, 116, 139);
  doc.text("Scan to verify", qrX + qrSize / 2, originY + h - 2, { align: "center" });

  // Signature Block (Right side)
  const signX = originX + w - 5;
  const signY = originY + h - 5;

  if (config.signature?.imageUrl) {
    const sigData = await loadImageDataUrl(config.signature.imageUrl);
    if (sigData) {
      try {
        doc.addImage(sigData, "PNG", signX - 25, signY - 7.5, 25, 5);
      } catch {}
    }
  } else {
    // Signature line
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.3);
    doc.line(signX - 32, signY - 2, signX, signY - 2);
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.5);
  doc.setTextColor(15, 23, 42);
  doc.text(config.signature.label || "Authorized Signatory", signX, signY, { align: "right" });

  // Bottom colored line
  doc.setFillColor(primaryR, primaryG, primaryB);
  doc.rect(originX, originY + h - 1.5, w, 1.5, "F");
}

/**
 * Generate Single CR80 Card PDF (2 pages: Page 1 = Front, Page 2 = Back)
 */
export async function generateSingleCardPdf(
  card: CardRenderData,
  template: IdCardTemplate
): Promise<Blob> {
  const isAconStudent =
    card.entityType === "student" || template.layoutConfig.theme?.cardVariant === "acon-official-student";
  const isLandscape = isAconStudent ? false : template.orientation === "landscape";
  const w = isLandscape ? CR80_WIDTH : CR80_HEIGHT;
  const h = isLandscape ? CR80_HEIGHT : CR80_WIDTH;

  const doc = new jsPDF({
    orientation: isLandscape ? "landscape" : "portrait",
    unit: "mm",
    format: [w, h],
  });

  // Page 1: Front
  await renderCardFront(doc, card, template.layoutConfig, isLandscape, 0, 0);

  // Page 2: Back
  doc.addPage([w, h], isLandscape ? "landscape" : "portrait");
  await renderCardBack(doc, card, template.layoutConfig, isLandscape, 0, 0);

  return doc.output("blob");
}

/**
 * Draw Crop Marks around a card
 */
function drawCropMarks(doc: jsPDF, x: number, y: number, w: number, h: number) {
  const markLen = 2.5;
  const offset = 1;
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.15);

  // Top Left
  doc.line(x - offset - markLen, y, x - offset, y);
  doc.line(x, y - offset - markLen, x, y - offset);

  // Top Right
  doc.line(x + w + offset, y, x + w + offset + markLen, y);
  doc.line(x + w, y - offset - markLen, x + w, y - offset);

  // Bottom Left
  doc.line(x - offset - markLen, y + h, x - offset, y + h);
  doc.line(x, y + h + offset, x, y + h + offset + markLen);

  // Bottom Right
  doc.line(x + w + offset, y + h, x + w + offset + markLen, y + h);
  doc.line(x + w, y + h + offset, x + w, y + h + offset + markLen);
}

/**
 * Generate Batch Imposition PDF (A4 Duplex: Fronts on Page 1, Backs horizontally mirrored on Page 2)
 */
export async function generateBatchImpositionPdf(
  cards: CardRenderData[],
  template: IdCardTemplate
): Promise<Blob> {
  const isAconStudent =
    (cards.length > 0 && cards[0].entityType === "student") ||
    template.layoutConfig.theme?.cardVariant === "acon-official-student";
  const isLandscape = isAconStudent ? false : template.orientation === "landscape";
  const cardW = isLandscape ? CR80_WIDTH : CR80_HEIGHT;
  const cardH = isLandscape ? CR80_HEIGHT : CR80_WIDTH;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4", // 210 x 297 mm
  });

  // Calculate grid layout
  // For Portrait (54 x 85.6mm): 3 cols x 3 rows = 9 cards per sheet
  // For Landscape (85.6 x 54mm): 2 cols x 5 rows = 10 cards per sheet
  const cols = isLandscape ? 2 : 3;
  const rows = isLandscape ? 5 : 3;
  const cardsPerPage = cols * rows;

  const a4Width = 210;
  const a4Height = 297;

  // Margin calculation to center cards on A4
  const totalGridWidth = cols * cardW;
  const totalGridHeight = rows * cardH;
  const marginX = (a4Width - totalGridWidth) / 2;
  const marginY = (a4Height - totalGridHeight) / 2;

  let cardIndex = 0;
  let isFirstSheet = true;

  while (cardIndex < cards.length) {
    if (!isFirstSheet) {
      doc.addPage("a4", "portrait");
    }
    isFirstSheet = false;

    const sheetCards: Array<{ card: CardRenderData; col: number; row: number }> = [];

    // --- FRONT SHEET ---
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (cardIndex < cards.length) {
          const card = cards[cardIndex];
          sheetCards.push({ card, col: c, row: r });

          const x = marginX + c * cardW;
          const y = marginY + r * cardH;

          await renderCardFront(doc, card, template.layoutConfig, isLandscape, x, y);
          drawCropMarks(doc, x, y, cardW, cardH);

          cardIndex++;
        }
      }
    }

    // --- BACK SHEET (DUPLEX MIRRORED ALONG HORIZONTAL AXIS) ---
    doc.addPage("a4", "portrait");

    for (const item of sheetCards) {
      // Mirror the column: if col was 0 (left), back goes to cols - 1 - col (right)
      const mirroredCol = cols - 1 - item.col;
      const x = marginX + mirroredCol * cardW;
      const y = marginY + item.row * cardH;

      await renderCardBack(doc, item.card, template.layoutConfig, isLandscape, x, y);
      drawCropMarks(doc, x, y, cardW, cardH);
    }
  }

  return doc.output("blob");
}
