// ════════════════════════════════════════════════════════════════════
//  Work Orders — product mock, rendered INSIDE the real app shell.
//
//  Loads the actual index.html, injects the leaf through the same
//  #intelStrip / le-lhead / maint-ops-shell structure managementLeaf uses,
//  and screenshots it. Nothing here restyles the app: the only CSS added
//  is the row grammar itself, which is what would ship.
// ════════════════════════════════════════════════════════════════════
"use strict";
const { chromium } = require("/home/user/property-spine-api/node_modules/playwright");
const OUT = process.env.OUT;

//  The ONLY new CSS. Everything else — surface, hairlines, type, colour —
//  comes from the app. Built on the existing `.row` grammar
//  (border-top:1px solid var(--soft); padding:12px 0), not on a card.
const CSS = `
/*  ONE grid child, so .maint-ops-shell's 20px gap does not inflate the space
    between sections — my own margins control the rhythm.
    A readable measure, so the action sits NEAR the work it acts on. At the
    full 1080px shell width the verbs stranded themselves ~600px from the
    text and the eye had to travel the whole row to find them. */
.wo-body{max-width:780px}
.wo-sec{border-top:1px solid var(--soft);padding-top:10px;margin-top:18px}
.wo-sec:first-child{margin-top:0}
.wo-sec-t{font-weight:900;font-size:12px;letter-spacing:.02em;margin-bottom:2px}
.wo-sec-n{float:right;color:var(--faint);font-family:'IBM Plex Mono',monospace;font-size:10px;
          font-weight:400;letter-spacing:.1em;margin-top:2px}
.wo-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:16px;align-items:end;
        border-top:1px solid var(--soft);padding:10px 0;cursor:pointer}
.wo-sec-t + .wo-row{border-top:0}
.wo-row:hover .wo-t{text-decoration:underline;text-underline-offset:3px}
.wo-t{font-weight:800;font-size:14px;line-height:1.25}
.wo-t .u{font-weight:400;color:var(--muted)}
.wo-s{font-size:12.5px;margin-top:1px;line-height:1.3}
.wo-s.attn{color:var(--brass)} .wo-s.exc{color:var(--red)} .wo-s.calm{color:var(--muted)}
.wo-a{font-family:'IBM Plex Mono',monospace;font-size:10.5px;color:var(--faint);margin-top:3px;
      letter-spacing:.01em}
.wo-act{border:0;background:none;padding:0 0 1px;font:inherit;font-size:12.5px;font-weight:700;
        color:var(--green);cursor:pointer;white-space:nowrap;border-bottom:1px solid #bcd9ca}
.wo-act.red{color:var(--red);border-bottom-color:#eabbb3}
.wo-count{font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.1em;
          text-transform:uppercase;color:var(--brass);font-weight:700;margin-top:4px}
/* detail */
.wo-d-who{font-family:'IBM Plex Mono',monospace;font-size:10.5px;letter-spacing:.12em;
          text-transform:uppercase;color:var(--faint);margin-top:2px}
.wo-d-cur{font-size:15px;line-height:1.4;margin-top:13px;max-width:560px}
.wo-d-cur .attn{color:var(--brass)}
.wo-d-band{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:16px;align-items:baseline;
           border-top:1px solid var(--soft);margin-top:14px;padding-top:11px}
.wo-d-lbl{font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:.18em;
          text-transform:uppercase;color:var(--faint);font-weight:700}
.wo-d-lbl.red{color:var(--red)}
.wo-d-what{font-size:14px;font-weight:700;margin-top:4px}
.wo-hist{border-top:1px solid var(--soft);margin-top:14px;padding-top:11px}
.wo-hist summary{list-style:none;cursor:pointer;font-family:'IBM Plex Mono',monospace;font-size:10px;
        letter-spacing:.18em;text-transform:uppercase;color:var(--faint);font-weight:700}
.wo-hist summary::-webkit-details-marker{display:none}
.wo-hist summary::after{content:" ›"}
.wo-hr{display:grid;grid-template-columns:58px minmax(0,1fr);gap:12px;padding:5px 0;
       font-size:12.5px;color:var(--muted)}
.wo-hr .t{font-family:'IBM Plex Mono',monospace;font-size:10.5px;color:var(--faint)}
.wo-hr b{font-weight:700;color:var(--ink)}
@media(max-width:520px){
  .wo-row{grid-template-columns:minmax(0,1fr);gap:6px}
  .wo-row .wo-act{justify-self:start}
  .wo-d-band{grid-template-columns:minmax(0,1fr);gap:8px}
}
`;

const LIST = `<div class="wo-body">
<div class="wo-count">3 need action</div>

<div class="wo-sec">
  <div class="wo-sec-t">Needs action<span class="wo-sec-n">3</span></div>

  <div class="wo-row">
    <div>
      <div class="wo-t">Unit 302 <span class="u">· Sink leak</span></div>
      <div class="wo-s attn">Photo required to close</div>
      <div class="wo-a">Dana reported finished · 12:56 AM</div>
    </div>
    <button class="wo-act">Review</button>
  </div>

  <div class="wo-row">
    <div>
      <div class="wo-t">Unit 418 <span class="u">· No heat</span></div>
      <div class="wo-s attn">Entry could not be completed</div>
      <div class="wo-a">Marcus · 11:20 AM</div>
    </div>
    <button class="wo-act">Coordinate entry</button>
  </div>

  <div class="wo-row">
    <div>
      <div class="wo-t">Unit 210 <span class="u">· Running toilet</span></div>
      <div class="wo-s exc">Resident completion text failed</div>
      <div class="wo-a">Completed by Dana · 9:05 AM</div>
    </div>
    <button class="wo-act red">Retry</button>
  </div>
</div>

<div class="wo-sec">
  <div class="wo-sec-t">In progress<span class="wo-sec-n">2</span></div>
  <div class="wo-row">
    <div>
      <div class="wo-t">Unit 106 <span class="u">· Dishwasher leak</span></div>
      <div class="wo-a">Marcus is on the way · 12:41 AM</div>
    </div><span></span>
  </div>
  <div class="wo-row">
    <div>
      <div class="wo-t">Unit 233 <span class="u">· Closet door off track</span></div>
      <div class="wo-a">Dana accepted · 10:04 AM</div>
    </div><span></span>
  </div>
</div>

<div class="wo-sec">
  <div class="wo-sec-t">Recently completed<span class="wo-sec-n">3</span></div>
  <div class="wo-row">
    <div><div class="wo-t">Lobby <span class="u">· Light out</span></div>
    <div class="wo-a">Dana · yesterday 4:12 PM</div></div><span></span>
  </div>
  <div class="wo-row">
    <div><div class="wo-t">Unit 511 <span class="u">· Garbage disposal jam</span></div>
    <div class="wo-a">Marcus · yesterday 2:38 PM</div></div><span></span>
  </div>
  <div class="wo-row">
    <div><div class="wo-t">Unit 118 <span class="u">· Window latch</span></div>
    <div class="wo-a">Dana · yesterday 11:15 AM</div></div><span></span>
  </div>
</div>
</div>`;

const DETAIL_OPEN = `<div class="wo-body">
<div class="wo-d-who">Dana Reyes · opened 12:04 AM</div>
<div class="wo-d-cur">Dana reports the work is finished.
  <span class="attn">Photo required before close.</span></div>
<div class="wo-d-band">
  <div><div class="wo-d-lbl">Next</div><div class="wo-d-what">Obtain repair photo</div></div>
  <button class="wo-act">Ask Dana</button>
</div>
<details class="wo-hist"><summary>History</summary>
  <div class="wo-hr"><span class="t">12:56 AM</span><span><b>Dana</b> said the work was finished</span></div>
  <div class="wo-hr"><span class="t">12:41 AM</span><span><b>Dana</b> reports: leak stopped; valve still needed</span></div>
  <div class="wo-hr"><span class="t">12:22 AM</span><span><b>Dana</b> reported no access</span></div>
  <div class="wo-hr"><span class="t">12:10 AM</span><span><b>Dana</b> was on the way</span></div>
  <div class="wo-hr"><span class="t">12:06 AM</span><span><b>Dana</b> took the job</span></div>
</details>
</div>`;

const DETAIL_EXC = `<div class="wo-body">
<div class="wo-d-who">Dana Reyes · opened 8:12 AM</div>
<div class="wo-d-cur">Completed by Dana at 9:05 AM. Repair photo preserved.</div>
<div class="wo-d-band">
  <div><div class="wo-d-lbl red">Exception</div>
  <div class="wo-d-what">Resident completion text failed</div></div>
  <button class="wo-act red">Retry</button>
</div>
<details class="wo-hist"><summary>History</summary>
  <div class="wo-hr"><span class="t">9:05 AM</span><span><b>Dana</b> closed the work with a photo</span></div>
  <div class="wo-hr"><span class="t">9:03 AM</span><span><b>Dana</b> sent a repair photo</span></div>
  <div class="wo-hr"><span class="t">8:58 AM</span><span><b>Dana</b> said the work was finished</span></div>
  <div class="wo-hr"><span class="t">8:31 AM</span><span><b>Dana</b> couldn’t get in</span></div>
  <div class="wo-hr"><span class="t">8:15 AM</span><span><b>Dana</b> took the job</span></div>
</details>
</div>`;

//  The exact structure managementLeaf writes.
const leaf = (title, body) =>
  '<section class="le-lhead">' +
  '<button class="le-lhead-back" type="button"><span class="le-lhead-arrow">&lsaquo;</span>Management</button>' +
  '<h2>' + title + '</h2></section>' +
  '<div class="maint-ops-shell">' + body + '</div>';

(async () => {
  const b = await chromium.launch({
    executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox"] });

  //  #intelStrip lives inside SECTION.hero > MAIN#workspace, and the
  //  workspace starts hidden while MAIN#home is shown. Reveal the workspace
  //  and hide home — the same swap openDesk performs — rather than hiding
  //  arbitrary nodes, which is what left the first render blank.
  const paint = async (page, body, title) => {
    await page.evaluate(({ html }) => {
      //  The app boots to #entryGate — live-first, no session means sign in.
      //  Dismissed here because this is a STATIC mock; the real leaf is only
      //  reachable with a real session, which is the correct behaviour.
      const gate = document.getElementById("entryGate");
      if (gate) gate.style.display = "none";
      document.body.classList.remove("gated");
      document.getElementById("home").classList.add("hidden");
      document.getElementById("workspace").classList.remove("hidden");
      const hero = document.querySelector("#workspace .hero");
      Array.from(hero.children).forEach((el) => {
        if (el.id !== "intelStrip") el.style.display = "none";
      });
      const s = document.getElementById("intelStrip");
      s.classList.remove("hidden");
      s.innerHTML = html;
      window.scrollTo(0, 0);
    }, { html: leaf(title, body) });
    await page.waitForTimeout(120);
  };

  for (const [w, h, tag, scale] of [[1180, 900, "desktop", 2], [390, 844, "mobile", 3]]) {
    const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: scale });
    await p.goto("file:///home/user/property-spine-app/index.html", { waitUntil: "domcontentloaded" });
    await p.waitForTimeout(900);
    await p.addStyleTag({ content: CSS });

    await paint(p, LIST, "Work Orders");
    await p.screenshot({ path: `${OUT}/shell_${tag}_list.png` });

    await paint(p, DETAIL_OPEN, "Unit 302 · Sink leak");
    await p.screenshot({ path: `${OUT}/shell_${tag}_detail_open.png` });

    await paint(p, DETAIL_EXC, "Unit 210 · Running toilet");
    await p.screenshot({ path: `${OUT}/shell_${tag}_detail_exception.png` });
    await p.close();
  }
  await b.close();
  console.log("ok");
})();
