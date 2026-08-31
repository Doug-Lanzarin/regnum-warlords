import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const outDir = fileURLToPath(new URL("../public/icons/", import.meta.url));
mkdirSync(outDir, { recursive: true });

function svgIcon({ size, padding }) {
	const inner = size - padding * 2;
	return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
	<defs>
		<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
			<stop offset="0" stop-color="#1a2050"/>
			<stop offset="1" stop-color="#0b0e22"/>
		</linearGradient>
		<linearGradient id="mark" x1="0" y1="0" x2="1" y2="1">
			<stop offset="0" stop-color="#9ccdf9"/>
			<stop offset="1" stop-color="#bd93ff"/>
		</linearGradient>
	</defs>
	<rect width="${size}" height="${size}" fill="url(#bg)"/>
	<g transform="translate(${padding},${padding})">
		<path d="M${inner * 0.5} ${inner * 0.06}
			L${inner * 0.92} ${inner * 0.26}
			V${inner * 0.56}
			C${inner * 0.92} ${inner * 0.76} ${inner * 0.74} ${inner * 0.92} ${inner * 0.5} ${inner * 0.98}
			C${inner * 0.26} ${inner * 0.92} ${inner * 0.08} ${inner * 0.76} ${inner * 0.08} ${inner * 0.56}
			V${inner * 0.26} Z"
			fill="url(#mark)" opacity="0.18" stroke="url(#mark)" stroke-width="${inner * 0.035}"/>
		<text x="${inner * 0.5}" y="${inner * 0.62}" font-family="Segoe UI, Arial, sans-serif" font-size="${inner * 0.38}"
			font-weight="800" fill="url(#mark)" text-anchor="middle">RW</text>
	</g>
</svg>`;
}

const targets = [
	{ file: "icon-192.png", size: 192, padding: 0 },
	{ file: "icon-512.png", size: 512, padding: 0 },
	{ file: "maskable-512.png", size: 512, padding: 64 },
];

for (const t of targets) {
	const svg = svgIcon({ size: t.size, padding: t.padding });
	await sharp(Buffer.from(svg)).png().toFile(path.join(outDir, t.file));
	console.log("wrote", t.file);
}
