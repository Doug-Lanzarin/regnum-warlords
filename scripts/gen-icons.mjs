import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const outDir = fileURLToPath(new URL("../public/icons/", import.meta.url));
const sourceFile = fileURLToPath(new URL("./assets/app-icon-source.jpg", import.meta.url));
mkdirSync(outDir, { recursive: true });

// Sampled from the source artwork's own edge so the maskable padding blends
// in instead of showing a visible seam around the safe-zone circle.
const MASKABLE_BG = { r: 7, g: 8, b: 6 };

const PNG_OPTS = { compressionLevel: 9, palette: true, quality: 90, effort: 10 };

async function squareIcon(size, file) {
	await sharp(sourceFile).resize(size, size, { fit: "cover" }).png(PNG_OPTS).toFile(path.join(outDir, file));
	console.log("wrote", file);
}

async function maskableIcon(size, file) {
	// Maskable icons get cropped to a circle/squircle by the OS — keep the
	// artwork inside the ~80% "safe zone" so the shield doesn't get clipped.
	const inner = Math.round(size * 0.82);
	const artwork = await sharp(sourceFile).resize(inner, inner, { fit: "cover" }).toBuffer();
	await sharp({
		create: { width: size, height: size, channels: 3, background: MASKABLE_BG },
	})
		.composite([{ input: artwork, gravity: "center" }])
		.png(PNG_OPTS)
		.toFile(path.join(outDir, file));
	console.log("wrote", file);
}

await squareIcon(192, "icon-192.png");
await squareIcon(512, "icon-512.png");
await maskableIcon(512, "maskable-512.png");
