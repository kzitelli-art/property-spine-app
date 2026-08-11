/* PROPERTY SPINE — DEPLOYED BUILD IDENTITY (S2)
 *
 * The app is served as committed static files with no build step, so a commit
 * cannot embed its own SHA. The stamp is therefore ONE COMMIT BEHIND by
 * construction: after each release commit, a follow-up "stamp" commit writes
 * that release's SHA here. code_sha names the commit whose code is running;
 * the deployed head is that commit's stamp child. The post-deploy probe
 * compares window.__PS_BUILD.code_sha against the release SHA it expects.
 *
 * IT IS RELEASE IDENTITY, NOT A PASS. This stamp says which commit the served
 * files came from. It says nothing about whether the surface works — that is
 * the browser rung, and it is recorded in docs/THREAD_HANDOFF.md, not here.
 */
window.__PS_BUILD = Object.freeze({
  code_sha: "8352a8b402f2d7c620f6bd9e54a86a19c550636d",
  slice: "Work Orders — visual pass + resident link",
  stamped_at: "2026-08-11",
});
