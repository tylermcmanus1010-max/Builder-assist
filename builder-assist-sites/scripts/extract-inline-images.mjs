import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const root = new URL("..", import.meta.url).pathname;
const htmlPath = path.join(root, "public/index.html");
const outputDir = path.join(root, "public/embedded-images");
let html = await fs.readFile(htmlPath, "utf8");
await fs.mkdir(outputDir, { recursive: true });

const targets = ["__IMG", "__PHXIMG"];
let extracted = 0;
for (const target of targets) {
  const expression = new RegExp(`window\\.${target} = (\\{[^\\n]+\\});`);
  const match = html.match(expression);
  if (!match) throw new Error(`Inline image object ${target} was not found.`);
  const values = JSON.parse(match[1]);
  for (const [key, value] of Object.entries(values)) {
    if (typeof value !== "string" || !value.startsWith("data:image/")) continue;
    const dataMatch = value.match(/^data:image\/([a-zA-Z0-9.+-]+);base64,(.+)$/);
    if (!dataMatch) continue;
    const extension = dataMatch[1].toLowerCase().replace("jpeg", "jpg").replace("svg+xml", "svg");
    const bytes = Buffer.from(dataMatch[2], "base64");
    const digest = crypto.createHash("sha256").update(bytes).digest("hex").slice(0, 16);
    const safeKey = key.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "image";
    const filename = `${target.slice(2).toLowerCase()}-${safeKey}-${digest}.${extension}`;
    await fs.writeFile(path.join(outputDir, filename), bytes);
    values[key] = `/embedded-images/${filename}`;
    extracted += 1;
  }
  html = html.replace(expression, `window.${target} = ${JSON.stringify(values)};`);
}
await fs.writeFile(htmlPath, html);
console.log(`Extracted ${extracted} inline images into ${outputDir}.`);
