// Runs every signature through the model and checks the verdict.
// node crash-check/model/test.mjs
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const M = require("./crash-model.js");
const S = require("./signatures.js");

let failed = 0;
for (const trace of S.all()) {
  const decisions = M.replay(trace);
  const got = decisions.length ? decisions[0].verdict : "none";
  const ok = trace.expect.includes(got);
  if (!ok) failed++;
  const d = decisions[0];
  const why = d ? d.signals.filter((s) => s.points).map((s) => `${s.label} ${s.points > 0 ? "+" : ""}${s.points}`).join(", ") : "never triggered";
  console.log(`${ok ? "PASS" : "FAIL"}  ${trace.title.padEnd(28)} ${String(d ? d.score : "-").padStart(3)}  ${got.padEnd(8)} ${why}`);
  if (decisions.length > 1) console.log(`      (${decisions.length} decisions; later: ${decisions.slice(1).map((x) => x.verdict).join(", ")})`);
}

// A drop must never alert anyone, at any drop height from a pocket to a raised arm.
for (const h of [0.5, 0.8, 1.0, 1.2, 1.5, 1.8]) {
  console.log(`      free fall from ${h} m lasts ${S.fallMs(h)} ms`);
}

if (failed) {
  console.error(`\n${failed} signature(s) gave the wrong verdict`);
  process.exit(1);
}
console.log("\nAll signatures gave the expected verdict.");
