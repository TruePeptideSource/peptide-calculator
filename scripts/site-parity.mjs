#!/usr/bin/env node
/**
 * Records truepeptidesource.com's own answers for a set of calculations
 * (through its public MCP endpoint) into test/fixtures/site-parity.json.
 * test/parity.test.ts then checks this library returns the same numbers.
 *
 * Run: node scripts/site-parity.mjs
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const MCP = "https://truepeptidesource.com/mcp";

const RECON = [
  { vialAmount: 10, waterMl: 2, dose: 2, doseUnit: "mg" },
  { vialAmount: 20, waterMl: 2, dose: 2.5, doseUnit: "mg" },
  { vialAmount: 20, waterMl: 1, dose: 2.5, doseUnit: "mg" },
  { vialAmount: 5, waterMl: 2, dose: 0.25, doseUnit: "mg" },
  { vialAmount: 10, waterMl: 2, dose: 0.25, doseUnit: "mg" },
  { vialAmount: 10, waterMl: 2, dose: 250, doseUnit: "mcg" },
  { vialAmount: 6, waterMl: 2, dose: 1, doseUnit: "mg" },
  { vialAmount: 10, waterMl: 3, dose: 250, doseUnit: "mcg" },
  { vialAmount: 15, waterMl: 1.5, dose: 7.5, doseUnit: "mg" },
  { vialAmount: 30, waterMl: 3, dose: 2.4, doseUnit: "mg" },
  { vialAmount: 2, waterMl: 1, dose: 100, doseUnit: "mcg" },
  { vialAmount: 7, waterMl: 3, dose: 333, doseUnit: "mcg" },
];

const REVERSE = [
  { vialAmount: 10, waterMl: 2, unitsDrawn: 10, syringe: "U-100" },
  { vialAmount: 10, waterMl: 2, unitsDrawn: 10, syringe: "U-40" },
  { vialAmount: 5, waterMl: 2, unitsDrawn: 12.5, syringe: "U-100" },
  { vialAmount: 60, waterMl: 6, unitsDrawn: 25, syringe: "U-50" },
];

const BLEND = [
  { components: [{ peptide: "BPC-157", amount: 5, unit: "mg" }, { peptide: "TB-500", amount: 5, unit: "mg" }], waterMl: 2, totalDose: true, dose: 500, doseUnit: "mcg" },
  { blend: "KLOW", waterMl: 4, totalDose: true, dose: 2, doseUnit: "mg" },
  { blend: "KLOW", waterMl: 3, targetPeptide: "BPC-157", dose: 500, doseUnit: "mcg" },
  { blend: "GLOW", waterMl: 3, totalDose: true, dose: 2.33, doseUnit: "mg" },
];

let id = 0;
async function call(name, args, attempt = 1) {
  try {
    return await callOnce(name, args);
  } catch (error) {
    if (attempt >= 3) throw error;
    await new Promise((r) => setTimeout(r, 1000 * attempt));
    return call(name, args, attempt + 1);
  }
}

async function callOnce(name, args) {
  const res = await fetch(MCP, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
    body: JSON.stringify({ jsonrpc: "2.0", id: ++id, method: "tools/call", params: { name, arguments: args } }),
  });
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
  const body = await res.json();
  if (body.error || body.result?.isError) throw new Error(`${name}: ${JSON.stringify(body.error ?? body.result.content)}`);
  return body.result.structuredContent;
}

const out = { source: MCP, recordedAt: new Date().toISOString().slice(0, 10), reconstitution: [], reverse: [], blend: [] };

for (const c of RECON) {
  const s = await call("peptide_reconstitution_calculator", { vialUnit: "mg", syringe: "U-100", ...c });
  out.reconstitution.push({ input: c, site: { units: s.reading.units, liquidPerDose: s.liquidPerDose, concentration: s.concentration, fullDosesPerVial: s.fullDosesPerVial, otherSyringes: s.otherSyringes.map((o) => ({ syringe: o.syringe, units: o.units })) } });
}
for (const c of REVERSE) {
  const s = await call("peptide_reconstitution_calculator", { vialUnit: "mg", ...c });
  out.reverse.push({ input: c, site: s });
}
for (const c of BLEND) {
  const { totalDose, ...rest } = c;
  const args = totalDose ? { ...rest, totalDose: true } : rest;
  const s = await call("peptide_blend_calculator", args);
  out.blend.push({ input: c, site: s });
}

writeFileSync(fileURLToPath(new URL("../test/fixtures/site-parity.json", import.meta.url)), `${JSON.stringify(out, null, 2)}\n`);
console.log(`Recorded ${RECON.length + REVERSE.length + BLEND.length} site answers.`);
