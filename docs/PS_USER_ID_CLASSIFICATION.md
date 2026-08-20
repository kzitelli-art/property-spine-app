# `ps_user_id` — complete use classification

Every current use of `<input id="userId">`, `localStorage.getItem('ps_user_id')`
and `userId()` in `index.html`, classified into exactly one category.

**Only INVALID STAFF ATTRIBUTION is automatically wrong.** The others are
recorded so that `ps_user_id` is not deleted globally before every use has an
owner.

| Site | Use | Classification | Disposition |
|---|---|---|---|
| `14171` application approve | sent `body.approved_by = userId()` to the shared-key door | **INVALID STAFF ATTRIBUTION** | **REMOVED.** Migrated to `__psLive.approveApplication`, whose manifest `buildBody` returns `{}`. The browser cannot send an actor even by accident. |
| `15977` countersign preview | sent `body.actor_id = userId()` to a route no router registers | **INVALID STAFF ATTRIBUTION** *and* **OBSOLETE** | **REMOVED.** The route does not exist and the business concept was retired at migration 088. |
| `14217` obligation claim | gated whether the Claim **button** renders | **DISPLAY OR LOCAL PREFERENCE** — but defective | **CORRECTED.** See below. |
| `6117–6228` preview journal | builds `{kind:'human', id: …}` actors for the offline device journal | **PREVIEW OR TEST STATE** | **RETAINED.** Never reaches a canonical service. Must never look authenticated — the surrounding preview paths no longer claim durable success. |
| `9894`, `9897` settings | reads/writes the field to `localStorage` | **DISPLAY OR LOCAL PREFERENCE** | **RETAINED.** Storage only. It enters no write attribution once the sites above are migrated. |
| `14645` tour coverage rule | `created_by: userId()` | **INVALID STAFF ATTRIBUTION** | **NOT YET MIGRATED** — route not yet in the completed set. |
| `14646` coverage exception | `created_by: userId()` | **INVALID STAFF ATTRIBUTION** | **NOT YET MIGRATED** |
| `14647` tour capture | `actor_id: userId()` | **INVALID STAFF ATTRIBUTION** | **NOT YET MIGRATED** |
| `14648` tour action | `body.actor_id = userId()`, `actor_type:'human'` | **INVALID STAFF ATTRIBUTION** | **NOT YET MIGRATED** |
| `14649` tour check-in | refuses to proceed without `userId()`, then sends it as `actor_id` | **INVALID STAFF ATTRIBUTION** | **NOT YET MIGRATED** — and the worst of the group: it *demands* a typed identity before recording that a human was physically on site. |

## The obligation-claim correction

The claim is **self-claim, and it was already migrated.** `WRITE_ACTIONS.claimObligation`
posts an **empty body** and the server resolves the claimant from the session —
the source states it: *"SELF-CLAIM. The claimant is the authenticated staff
member, resolved server-side. The browser sends NO user_id."*

So `userId()` there was never attribution. It gated the **button**, and told a
signed-in operator with an empty text box: *"Enter User ID to claim."* The gate
advertised a requirement the governed path had already removed.

It now gates on `__psLive.hasSession()` and reads *"Sign in to claim this work."*
No generic `user_id` field serves two meanings, because the payload carries none.

## Counts

```
INVALID STAFF ATTRIBUTION     7    2 removed · 5 pending their route migration
DISPLAY OR LOCAL PREFERENCE   2    retained, 1 corrected
PREVIEW OR TEST STATE         1    retained, isolated
TARGET USER SELECTION         0    no site selects another governed user
OBSOLETE                      1    countersign preview (counted once above)
```

**`ps_user_id` is not deleted.** Five invalid-attribution sites remain, each
blocked on its own route migration. Deleting the field now would break them
silently instead of visibly, which is the wrong order.
