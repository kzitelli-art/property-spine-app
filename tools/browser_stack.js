#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════
   browser_stack.js — the two servers a browser proof needs, and nothing else.

   1. a static file server for index.html, on http
   2. a TLS terminator in front of the real API

   ── WHY THE TERMINATOR EXISTS ───────────────────────────────────────
   The app's live loader is SEALED to the production origin on purpose:
   "built ONCE with fixed production deps. NO test mode, NO override
   controls, NO token injector. Frozen." Editing index.html to point
   somewhere else would make every browser proof a proof about a modified
   app.

   So the app is never touched and the TRANSPORT is redirected instead.
   Playwright's route.continue() refuses to change protocol, and the pinned
   origin is https — so the local API needs an https front. This is that
   front: it adds TLS and forwards bytes. It parses nothing, decides
   nothing and rewrites nothing.

   CLASS 3 — harness infrastructure. Never reachable from production; it
   binds loopback only and is started and stopped by the proof that uses it.
   ════════════════════════════════════════════════════════════════════ */
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const http = require("http");
const https = require("https");
const { execFileSync } = require("child_process");

function selfSignedCert() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spine-tls-"));
  const key = path.join(dir, "k.pem"), crt = path.join(dir, "c.pem");
  execFileSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes",
    "-keyout", key, "-out", crt, "-days", "2", "-subj", "/CN=127.0.0.1",
    "-addext", "subjectAltName=IP:127.0.0.1,DNS:localhost"], { stdio: "ignore" });
  return { key: fs.readFileSync(key), cert: fs.readFileSync(crt) };
}

/*  Static server for the app directory. Only serves files that exist under
 *  the root — the ".." guard is not decoration, this runs with the repo
 *  readable. */
function serveStatic(root, port) {
  const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
                  ".json": "application/json", ".svg": "image/svg+xml", ".csv": "text/csv" };
  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent(String(req.url).split("?")[0]);
    const file = path.join(root, rel === "/" ? "index.html" : rel);
    if (!file.startsWith(path.resolve(root))) { res.writeHead(403).end("no"); return; }
    fs.readFile(file, (err, buf) => {
      if (err) { res.writeHead(404).end("not found"); return; }
      res.writeHead(200, { "content-type": TYPES[path.extname(file)] || "application/octet-stream",
                           "cache-control": "no-store" });
      res.end(buf);
    });
  });
  return new Promise((resolve) => server.listen(port, "127.0.0.1", () => resolve(server)));
}

/*  https:PORT → http:apiPort. Streams the body through untouched, so a
 *  multipart upload arrives at the API exactly as the browser sent it. */
function serveTls(apiPort, port) {
  const { key, cert } = selfSignedCert();
  const server = https.createServer({ key, cert }, (req, res) => {
    const headers = Object.assign({}, req.headers);
    delete headers.host;
    const up = http.request({ host: "127.0.0.1", port: apiPort, method: req.method,
      path: req.url, headers }, (r) => {
      res.writeHead(r.statusCode, Object.assign({}, r.headers, {
        //  The browser is on a different origin from the API here, which
        //  it never is in production. CORS is answered permissively at
        //  this layer ONLY, so the proof exercises the app's real fetches
        //  without loosening anything in the API itself.
        "access-control-allow-origin": "*",
        "access-control-allow-headers": "*",
        "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
      }));
      r.pipe(res);
    });
    up.on("error", (e) => { res.writeHead(502).end(String(e.message)); });
    if (req.method === "OPTIONS") {
      res.writeHead(204, { "access-control-allow-origin": "*",
        "access-control-allow-headers": "*",
        "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS" });
      res.end(); up.destroy(); return;
    }
    req.pipe(up);
  });
  return new Promise((resolve) => server.listen(port, "127.0.0.1", () => resolve(server)));
}

module.exports = { serveStatic, serveTls };
