#!/usr/bin/env node
/** Bundles the widget into dist/embed.js and fails if it grows past the 30 KB gzip budget. */
import { build } from "esbuild";
import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";

const outfile = "dist/embed.js";
const BUDGET_GZIP_BYTES = 30 * 1024;

await build({
  entryPoints: ["src/widget/embed.ts"],
  outfile,
  bundle: true,
  minify: true,
  format: "iife",
  target: ["es2020"],
  legalComments: "inline",
  charset: "utf8",
});

const raw = readFileSync(outfile);
const gz = gzipSync(raw, { level: 9 }).length;
console.log(`${outfile}: ${(raw.length / 1024).toFixed(1)} KB, ${(gz / 1024).toFixed(1)} KB gzipped`);
if (gz > BUDGET_GZIP_BYTES) {
  console.error(`embed.js is over the ${BUDGET_GZIP_BYTES / 1024} KB gzip budget`);
  process.exit(1);
}
