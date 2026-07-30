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
  code_sha: "51d07fd1f6134ab78861a4badffa74a16eac9da1",
  slice: "S2 live-first safety cleanup",
  stamped_at: "2026-07-30",
});
