# Boundary 6 — which surface the receipt belongs on

**Status:** the removal is done and proven. The *browser* receipt was aimed at
the wrong surface. This records why, and where it goes instead.

## What happened

Boundary 6 removed the operator's completion control. The plan was to finish it
with a browser check: open a work order, confirm "Mark complete" is gone and
"Not 100% done" remains.

The operator could not find that screen. The tempting response — keep clicking
until it appears — is not evidence. "I eventually found it" says something about
whoever knows the codebase, not about what production routes to.

So it was traced from the code instead:
`closeout_surface_reachability.test.js`.

## The call chain

```
"Not 100% done"                     index.html:14748
  ← workOrderPanel(w)               index.html:14667      the closeout block
  ← renderDetail(r)                 index.html:14478      opens the drawer,
                                                          only when kind === 'work_order'
  ← 16 call sites
```

Of those 16, **8 are reachable** from a static entry point, and **3 can carry a
work order** — all three stranded:

| call site | enclosing function | reached only from |
|---|---|---|
| 12177 | `wqAttentionRow` | `renderMaintenanceWorkOrdersDashboard` — the retired fixture dashboard |
| 12281 | `renderMaintenanceWorkInProgress` | key `work_inprogress`, emitted only by that same dashboard |
| 14769 | `refreshWorkOrders` | inside the drawer itself |

The live route is `openMaintenanceModule('workorders')` → `openWorkOrdersDoor()`
→ `work-lifecycle-door.js`, which never had a completion control and never had
this drawer.

**Verdict: STRANDED.** The drawer holding the removed control is legacy.

## The one qualifier, and it is not comfortable

`renderMaintenance()` does pour work-order rows into
`renderRows('humanLane' | 'planLane')`, and those rows are clickable markup that
calls the drawer opener. In JavaScript terms that is a live route.

It is not a route an operator can take: the lane containers sit inside
`<section class="lanes">`, and the Maintenance desk sets
`body.maintenance-v6-mode`, under which `.lanes` is `display:none !important`.
The rows are written into markup nobody can see or click.

That is weaker than the call graph, and worth being uneasy about — deleting one
CSS line would make the retired drawer live again. So it is not a footnote: it
is three assertions (`Q4a′-1/2/3`) that go red if the markup moves, the rule
disappears, or the desk stops setting the class.

## Where the receipt goes

- **Source receipt** — `no_operator_completion_proof.test.js` (17 assertions).
  Covers the stranded drawer: the completion control and the stub-photo mint are
  gone, the not-done path survives.
- **Reachability receipt** — `closeout_surface_reachability.test.js` (19),
  falsified by `closeout_surface_reachability_falsification.js` (11). The trace
  goes red when the route is restored, when the CSS is deleted, when a lane
  moves, and when the traced control is itself removed.
- **Browser receipt** — belongs on `work-lifecycle-door.js`, the surface an
  operator actually reaches. That is the door's own acceptance, not this one.

We did not manufacture a navigation path to the legacy drawer to satisfy a
receipt. Unreachable is not the same as absent: the code is still there, and the
trace is what will notice if anything re-wires a live route into it.
