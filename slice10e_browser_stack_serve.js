#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════
//  slice10e_browser_stack_serve.js — the two servers the 10E browser
//  acceptance runs behind. CLASS 3 (test infrastructure). It is never part
//  of a publish artifact and never reaches a signed-in operator.
//
//  Slice 9's browser acceptance used an equivalent stack that was never
//  committed, so this thread had to reconstruct it from a screenshot recipe.
//  It is committed here so the next run is a command, not an archaeology.
//
//  ── WHAT IT RUNS ──────────────────────────────────────────────────
//    :8081  the PUBLISH DIRECTORY   — plain HTTP, exactly what the operator
//           browser loads.
//    :443   a TLS front, routed by Host:
//             property-spine-api.onrender.com → the local API on :3000
//             anything else                   → an empty JavaScript stub
//
//  ── WHY THE TLS FRONT ROUTES BY HOST ──────────────────────────────
//  index.html loads two third-party scripts over https (xlsx from jsDelivr,
//  Plaid Link). This container has no route to either. Chromium is started
//  with --host-resolver-rules mapping BOTH those hosts and the API host to
//  127.0.0.1:443, so every https request the page makes lands here. Serving
//  an empty 200 for the two CDN paths keeps the page's load path intact and
//  keeps "no failed request" a real assertion rather than a tolerated
//  exception list. Neither script participates in the surface under test:
//  xlsx is the spreadsheet importer and Plaid Link is bank linking.
//
//  ── WHAT THE PUBLISH DIRECTORY DELIBERATELY DOES NOT CONTAIN ──────
//  property-spine-data.js and policy.js are the two REAL production data
//  rails from docs/INCIDENT_STATIC_DATA_EXPOSURE.md §3b. They are still
//  loaded by index.html for other surfaces and they carry real resident
//  records. Serving them would put real resident data one screenshot away
//  from a proof artifact, which the standing constraint forbids absolutely.
//
//  The publish directory therefore receives EMPTY-GLOBAL STUBS in their
//  place, written by slice10e_publish_dir.js. That substitution is
//  legitimate here and nowhere else, and it is testable rather than
//  asserted: the acceptance proves the Future Rent Roll surface reads none
//  of the nineteen globals those files define, so an empty stub cannot
//  change what the surface under test renders.
//
//  Env: PUBLISH_DIR (required) · API_ORIGIN (default http://127.0.0.1:3000)
//  Writes /workspace/spine_proof/tls.pid so an outage can be simulated.
// ════════════════════════════════════════════════════════════════════
"use strict";
const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");

const PUBLISH = process.env.PUBLISH_DIR;
const API_ORIGIN = process.env.API_ORIGIN || "http://127.0.0.1:3000";
const PIDFILE = process.env.PIDFILE || "/workspace/spine_proof/tls.pid";
const CERT_DIR = process.env.CERT_DIR || "/workspace/spine_proof";
if (!PUBLISH) { console.error("need PUBLISH_DIR"); process.exit(1); }

const API_HOST = "property-spine-api.onrender.com";
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "application/javascript; charset=utf-8",
                ".json": "application/json; charset=utf-8", ".css": "text/css; charset=utf-8",
                ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon" };

// ── :8081 the publish directory ─────────────────────────────────────
const staticServer = http.createServer((req, res) => {
  const url = new URL(req.url, "http://127.0.0.1:8081");
  let rel = decodeURIComponent(url.pathname);
  if (rel === "/") rel = "/index.html";
  //  No traversal out of the publish directory. The publish root IS the
  //  boundary here, which is the same lesson the incident record ends on.
  const file = path.normalize(path.join(PUBLISH, rel));
  if (!file.startsWith(path.resolve(PUBLISH))) { res.writeHead(403).end("forbidden"); return; }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404, { "content-type": "text/plain" }).end("not found"); return; }
    res.writeHead(200, { "content-type": TYPES[path.extname(file)] || "application/octet-stream",
                         "cache-control": "no-store" });
    res.end(buf);
  });
});

// ── :443 TLS front, routed by Host ──────────────────────────────────
function proxyToApi(req, res) {
  const target = new URL(API_ORIGIN);
  const headers = { ...req.headers, host: target.host };
  const up = http.request({ hostname: target.hostname, port: target.port || 80,
                            path: req.url, method: req.method, headers },
    (r) => { res.writeHead(r.statusCode, r.headers); r.pipe(res); });
  up.on("error", (e) => {
    //  A dead API is a REAL outage to the page — not a synthesised body.
    if (!res.headersSent) res.writeHead(502, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "upstream_unavailable", detail: e.message }));
  });
  req.pipe(up);
}

const tlsServer = https.createServer(
  { key: fs.readFileSync(path.join(CERT_DIR, "front.key")),
    cert: fs.readFileSync(path.join(CERT_DIR, "front.crt")) },
  (req, res) => {
    const host = String(req.headers.host || "").split(":")[0];
    if (host === API_HOST) return proxyToApi(req, res);
    //  Third-party asset hosts (scripts and the webfont stylesheet). An empty
    //  asset, never a fabricated payload. The font stylesheet is answered as
    //  empty CSS on purpose: an empty @font-face set means the browser asks
    //  fonts.gstatic.com for nothing, so no font request can fail. The page
    //  falls back to its declared system stack, which changes metrics but not
    //  a single fact under test.
    const isCss = /\.css|\/css2?(\?|$)/.test(req.url || "");
    res.writeHead(200, {
      "content-type": isCss ? "text/css; charset=utf-8" : "application/javascript; charset=utf-8",
      "cache-control": "no-store",
    });
    res.end(isCss
      ? "/* slice10e stack: webfont stylesheet stubbed empty */\n"
      : "/* slice10e stack: third-party script stubbed; not part of the surface under test */\n");
  }
);

staticServer.listen(8081, "127.0.0.1", () => console.log("publish dir on :8081 from " + PUBLISH));
tlsServer.listen(443, "127.0.0.1", () => {
  fs.writeFileSync(PIDFILE, String(process.pid));
  console.log("tls front on :443 -> " + API_ORIGIN + "   (pid " + process.pid + ")");
});
