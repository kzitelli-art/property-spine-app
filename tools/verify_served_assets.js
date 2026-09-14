#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════
   verify_served_assets.js — prove a served static deploy is byte-for-byte
   the git blobs of a pinned commit.

   On 11 September this was done by hand and written up as
   docs/handoffs/new-hp/COMBINED_RELEASE_ASSETS_20260911.json in the API
   repo. This is the repeatable version of that same proof: same fields,
   same shape, run any time after a Render static-site deploy.

   Usage:
     node tools/verify_served_assets.js --commit <sha> --base <https://host> [--out <path.json>]

   File list: index.html plus every first-party <script src="..."> it
   references at that commit (relative paths only — no scheme, no leading
   "//"; CDN scripts are skipped because they are never relative).

   For each file: expected bytes come from `git show <commit>:<file>`;
   served bytes come from `GET <base>/<file>` with no cache and no
   redirect following. Both are hashed with SHA-256 and compared. A
   redirect is recorded as a mismatch with its status code. A file the
   commit does not contain is recorded as a mismatch with status null.

   Exit code is 0 only when every file came back 200 and matched.

   CLASS 3 — harness / release-verification tooling. Reads git and the
   network only; touches no database and writes only the --out file the
   caller asked for.
   ════════════════════════════════════════════════════════════════════ */
"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execFileSync } = require("child_process");

const REPO_ROOT = path.resolve(__dirname, "..");
const GIT_MAX_BUFFER = 64 * 1024 * 1024; // index.html alone is multiple MB

function usage() {
  return [
    "Usage: node tools/verify_served_assets.js --commit <sha> --base <https://host> [--out <path.json>]",
    "  --commit  required. Git commit-ish whose blobs are the expected bytes.",
    "  --base    required. Base URL the deploy is being served from (e.g. http://127.0.0.1:PORT).",
    "  --out     optional. Path to also write the JSON report to.",
  ].join("\n");
}

function parseArgs(argv) {
  const out = { commit: null, base: null, out: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--commit") { out.commit = argv[++i]; }
    else if (a === "--base") { out.base = argv[++i]; }
    else if (a === "--out") { out.out = argv[++i]; }
  }
  return out;
}

function sha256(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

/* Returns the buffer for <commit>:<relPath>, or null if git cannot find it
 * (does not exist in that commit / that tree). Any other git failure
 * (bad commit-ish, not a repo, etc.) is a hard error — it means the whole
 * run cannot be trusted, not that one file is missing. */
function gitShow(commit, relPath) {
  try {
    return execFileSync("git", ["show", `${commit}:${relPath}`], {
      cwd: REPO_ROOT,
      maxBuffer: GIT_MAX_BUFFER,
    });
  } catch (err) {
    const msg = String((err && err.stderr) || (err && err.message) || err);
    if (/exists on disk, but not in/i.test(msg) || /does not exist in/i.test(msg) ||
        /fatal: path .* does not exist/i.test(msg) || /fatal: invalid object name/i.test(msg)) {
      return null;
    }
    throw err;
  }
}

/* Parses <script src="..."> values out of raw HTML text, in document
 * order, keeping only first-party relative paths: no "scheme://" and no
 * leading "//". Query strings and fragments are stripped and a leading
 * "./" is dropped so "./foo.js" and "foo.js?v=x" both resolve to the same
 * file identity. De-duplicated, first occurrence wins the order. */
function extractFirstPartyScripts(html) {
  const re = /<script\b[^>]*\bsrc\s*=\s*(["'])(.*?)\1[^>]*>/gi;
  const seen = new Set();
  const files = [];
  let m;
  while ((m = re.exec(html)) !== null) {
    let src = m[2];
    if (!src) continue;
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(src)) continue; // has a scheme (http:, https:, data:, ...)
    if (src.startsWith("//")) continue; // protocol-relative host
    src = src.split("#")[0].split("?")[0];
    if (src.startsWith("./")) src = src.slice(2);
    if (!src || seen.has(src)) continue;
    seen.add(src);
    files.push(src);
  }
  return files;
}

async function fetchServed(base, file) {
  const url = `${base.replace(/\/+$/, "")}/${file}`;
  let res;
  try {
    res = await fetch(url, { cache: "no-store", redirect: "manual" });
  } catch (err) {
    return { status: null, buf: null, note: `fetch failed: ${err.message}` };
  }
  const status = res.status;
  if (status >= 300 && status < 400) {
    return { status, buf: null, note: "redirect" };
  }
  if (status !== 200) {
    return { status, buf: null };
  }
  const arrBuf = await res.arrayBuffer();
  return { status, buf: Buffer.from(arrBuf) };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.commit || !args.base) {
    process.stderr.write(usage() + "\n");
    process.exit(1);
    return;
  }

  const indexBuf = gitShow(args.commit, "index.html");
  if (indexBuf === null) {
    process.stderr.write(`fatal: index.html not found at commit ${args.commit}\n`);
    process.exit(1);
    return;
  }
  const scripts = extractFirstPartyScripts(indexBuf.toString("utf8"));
  const fileList = ["index.html", ...scripts];

  const files = [];
  for (const file of fileList) {
    const expectedBuf = file === "index.html" ? indexBuf : gitShow(args.commit, file);

    if (expectedBuf === null) {
      files.push({
        file,
        status: null,
        matches_commit: false,
        sha256: null,
        expected_sha256: null,
        note: "not in commit",
      });
      continue;
    }

    const expected_sha256 = sha256(expectedBuf);
    const served = await fetchServed(args.base, file);

    if (served.buf === null) {
      const entry = {
        file,
        status: served.status,
        matches_commit: false,
        sha256: null,
        expected_sha256,
      };
      if (served.note) entry.note = served.note;
      files.push(entry);
      continue;
    }

    const servedSha = sha256(served.buf);
    files.push({
      file,
      status: served.status,
      matches_commit: servedSha === expected_sha256,
      sha256: servedSha,
      expected_sha256,
    });
  }

  const all_match = files.every((f) => f.status === 200 && f.matches_commit === true);
  const report = {
    checked_at: new Date().toISOString(),
    commit: args.commit,
    base: args.base,
    all_match,
    files,
  };

  const json = JSON.stringify(report, null, 2);
  process.stdout.write(json + "\n");
  if (args.out) {
    fs.writeFileSync(args.out, json + "\n");
  }

  if (!all_match) {
    const bad = files.filter((f) => !(f.status === 200 && f.matches_commit === true)).map((f) => f.file);
    process.stderr.write(`mismatch: ${bad.join(", ")}\n`);
    process.exit(1);
    return;
  }
  process.exit(0);
}

main().catch((err) => {
  process.stderr.write(`fatal: ${err && err.stack ? err.stack : err}\n`);
  process.exit(1);
});
