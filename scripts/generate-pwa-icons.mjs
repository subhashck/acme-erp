import sharp from "sharp";
import { fileURLToPath } from "node:url";

// Original website favicon: https://acmefertilitycentre.com/wp-content/uploads/2024/10/A.png
const source = fileURLToPath(new URL("../public/icons/acme-source.png", import.meta.url));
for (const [name, size, scale] of [
  ["favicon.png", 48, 0.88],
  ["pwa-192.png", 192, 0.88],
  ["pwa-512.png", 512, 0.88],
  ["apple-touch-icon.png", 180, 0.88],
  // Keep all artwork within the central maskable safe-zone circle.
  ["pwa-maskable-512.png", 512, 0.64]
]) {
  const artworkSize = Math.round(size * scale);
  const artwork = await sharp(source).resize(artworkSize, artworkSize, {
    fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 }
  }).png().toBuffer();
  const background = name === "favicon.png"
    ? { r: 255, g: 255, b: 255, alpha: 0 }
    : "#ffffff";
  await sharp({ create: { width: size, height: size, channels: 4, background } })
    .composite([{ input: artwork, gravity: "centre" }]).png()
    .toFile(fileURLToPath(new URL(`../public/icons/${name}`, import.meta.url)));
}
