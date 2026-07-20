#!/usr/bin/env node
/*
 * PREVIEW-ONLY BUILD (Render static site build command for the preview app).
 * Reads the CLEAN committed index.html (production origin), replaces the API
 * origin with the preview API, and writes dist/index.html. The committed source
 * is never modified — production stays merge-safe. Fails loudly if it cannot
 * target the preview API, so the preview can never silently hit production.
 *
 * Render static-site builds have access to env vars, so set on the preview app:
 *     PREVIEW_API_BASE=https://property-spine-api-terms-preview.onrender.com
 * and set the publish directory to:  dist
 */
const fs = require("fs");

const SRC = "index.html";
const OUT_DIR = "dist";
const OUT = `${OUT_DIR}/index.html`;
const PROD_ORIGIN = "https://property-spine-api.onrender.com"; // the frozen production origin in the committed file
const preview = process.env.PREVIEW_API_BASE;

if (!preview) throw new Error("PREVIEW_API_BASE is required for the preview build");
if (!/^https:\/\/[a-z0-9.-]+$/i.test(preview)) throw new Error(`PREVIEW_API_BASE looks malformed: ${preview}`);

const src = fs.readFileSync(SRC, "utf8");
const before = src.split(PROD_ORIGIN).length - 1;

// The committed file references the production origin in a known set of places
// (the frozen PRODUCTION_ORIGIN constant + the API input defaults/placeholder).
// Replace ALL of them so the preview app defaults to the preview API everywhere.
if (before < 1) {
  throw new Error(`Expected at least one production origin to replace; found ${before}. Is this the right file?`);
}

const built = src.split(PROD_ORIGIN).join(preview);
const after = built.split(PROD_ORIGIN).length - 1;
if (after !== 0) throw new Error(`Substitution incomplete: ${after} production origin(s) still present`);

// Sanity: the frozen client constant must now point at the preview API.
if (!built.includes(`var PRODUCTION_ORIGIN = '${preview}'`)) {
  throw new Error("Frozen PRODUCTION_ORIGIN constant was not rewritten to the preview API");
}

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT, built);
console.log(`Preview build OK — replaced ${before} origin reference(s) → ${preview}`);
console.log(`Wrote ${OUT}`);
