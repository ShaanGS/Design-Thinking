// Builds the prototype into two single files, with the model and the art inlined:
//   prototype/index.html     a normal web page. Host it anywhere over https (or open it
//                            on localhost) and it reads the phone's real motion sensor.
//   prototype/artifact.html  the same page for a claude.ai artifact, where the two phones
//                            talk over the artifact's live room instead.
// node crash-check/prototype/build.mjs
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { dirname, join, extname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const read = (p) => readFileSync(join(here, p), "utf8");

const art = {};
for (const f of readdirSync(join(here, "art"))) {
  if (extname(f) !== ".webp") continue;
  art[basename(f, ".webp")] = `data:image/webp;base64,${readFileSync(join(here, "art", f)).toString("base64")}`;
}

// Replace with functions so "$" in the sources is never read as a replacement pattern.
const body = read("app.html")
  .replace("/*@@MODEL@@*/", () => read("../model/crash-model.js"))
  .replace("/*@@SIGNATURES@@*/", () => read("../model/signatures.js"))
  .replace("/*@@ART@@*/ {}", () => JSON.stringify(art));

writeFileSync(join(here, "artifact.html"), body);
writeFileSync(
  join(here, "index.html"),
  `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<meta name="theme-color" content="#ffffff">\n</head>\n<body>\n${body}\n</body>\n</html>\n`,
);
console.log(`Built index.html and artifact.html (${Math.round(body.length / 1024)} KB, ${Object.keys(art).length} pictures)`);
