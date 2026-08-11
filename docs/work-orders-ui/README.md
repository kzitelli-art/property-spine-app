# Work Orders — browser evidence

Captured by `work_lifecycle_browser_proof.browser.js` on the run that
finished **145 assertions, 145 passed, 0 failed**, against app
`fd94030` and the rebased API branch, on real Postgres through a real
`server.js`.

These are the rung the source tests cannot reach. Density, balance and
legibility are not provable from source; they were judged here.

| file | what it shows |
|---|---|
| `01-needs-action-queue.png` | The queue. Seven rows needing action, counted in plain words in the header, no status pills anywhere. |
| `02-no-access-detail.png` | A resident already asked. The detail states the operating fact and offers **no** second send — there is nothing left to send. |
| `03-proof-required-detail.png` | A claim without proof. One statement under `WHAT IS HAPPENING`, one dominant action under `NEXT`, `Still needs work` under `WHAT YOU CAN DO`, `HISTORY` collapsed. |
| `04-completed-with-exception-detail.png` | Completed work whose resident text failed. The completion holds; the failed text is an exception, not a next step. |
| `05-desktop-density-1440.png` | Desktop at 1440px. Seven work orders visible without scrolling, rows at 68px. |
| `06-mobile-queue-390.png` | 390px. The action stacks under the row rather than squeezing the sentence; the leaf begins within two spacing units of the app bar. |
| `07-navigated-real-operator-path.png` | The operator's real path — Maintenance → Work orders → live read → a write that crossed the live seam into the real database. Not a harness-opened door. |

## What these do not prove

They are one property's data at one moment. They say nothing about
scale, about a property with hundreds of open work orders, or about how
the surface reads on a device narrower than 390px. Nothing here was
measured with a resident on the other end of a real carrier — every send
in the run used the reserved test range.
