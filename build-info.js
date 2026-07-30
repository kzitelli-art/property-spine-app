/* PROPERTY SPINE — DEPLOYED BUILD IDENTITY (S2)
 *
 * The app is served as committed static files with no build step, so a commit
 * cannot embed its own SHA. The stamp is therefore ONE COMMIT BEHIND by
 * construction: after each release commit, a follow-up "stamp" commit writes
 * that release's SHA here. code_sha names the commit whose code is running;
 * the deployed head is that commit's stamp child. The post-deploy probe
 * compares window.__PS_BUILD.code_sha against the release SHA it expects.
 */
window.__PS_BUILD = Object.freeze({
  code_sha: "338b40f1ad9ccd58d68571f58a4c5a6b7f0f68d2",
  slice: "S4 unified Leasing Work",
  stamped_at: "2026-07-30",
});
