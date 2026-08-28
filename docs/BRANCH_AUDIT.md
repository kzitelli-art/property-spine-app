# Branch audit — 2026-08-27

The repo carries **81 remote branches + 17 local** against a `main` whose
release state is `c6769ba`. This audit classifies them; **nothing was
deleted** — deletion is an owner decision, one batch at a time.

## Safe to delete (fully merged into origin/main)

Local: `feat/staff-roles`, `feat/super-admin-panel`.
Remote: 36 of 80 (`git branch -r` minus HEAD, each verified
`git merge-base --is-ancestor` against `origin/main` — the list is
regenerable with that exact command; the count is the durable fact).

## Kept — unmerged local branches (15)

| Branch | Note |
|---|---|
| `chore/stamp-build-info-5f7ecf7` | Stale stamp: writes the SHA of `5f7ecf7`, but `main` has moved to `c6769ba`. The stamp mechanism is by design one commit behind — a NEW stamp commit should follow the next release, not this one |
| `backup-before-email-rewrite` | Named as a backup — owner decides whether the backup concern is retired |
| `chore/mobile-polish`, `chore/remove-dev-qa-panel` | UI work, state unverified |
| `feat/icon-and-gear-cleanup`, `feat/org-onboarding-wizard`, `feat/slice-6-renewals-destination`, `feat/slice-7-market-pricing-workspace` | Feature branches; verify against main before rebasing or deleting |
| `fix/followups-door-regression`, `fix/icon-sizing`, `fix/icon-tilt-enlarge`, `fix/icon-transform-override`, `fix/static-icons-sizing`, `fix/wrench-slightly-smaller` | Five separate icon-fix branches — likely superseded by whatever landed on main; diff before deciding |

## Remote-only `claude/*` branches (44 unmerged)

Session-work branches. Each needs the same
`git merge-base --is-ancestor` check before deletion; unmerged ones may
contain rulings or receipts cited from `docs/` — the API repo's rule
applies here too: **parked branches carry frozen decisions; search them
before deciding they were already decided.**

## Rule going forward

Delete a branch only when its content is (a) merged, or (b) named in a
receipt as superseded, or (c) ruled disposable by the owner. A branch that
is none of these stays and stays listed here.
