# ADR 0001 — Split the backend monolith (`server/src/index.ts`)

Status: Proposed
Date: 2026-07-03

## Context

The entire backend — 108 routes across 24 resources — lives in a single
**171 KB / ~5,000-line** file, `server/src/index.ts`. Middleware setup, business
logic, and every route handler are co-located. This is the largest structural
risk in the codebase:

- Any change forces a reviewer to reason about the whole file.
- Merge conflicts are near-guaranteed when two people touch the backend.
- There are **no automated tests** covering the handlers, so a refactor has no
  safety net beyond `tsc`.

Route distribution (by `/api/<resource>`):

| resource | routes | resource | routes |
|---|---|---|---|
| pick-lists | 19 | tags | 4 |
| admin | 19 | notifications | 4 |
| stock-counts | 8 | client-folder-access | 3 |
| purchase-orders | 8 | billing | 3 |
| auth | 8 | org / uploads / data / feedback | 2 each |
| team | 7 | (11 more) | 1 each |
| items / folders | 5 each | | |

## Decision

Extract handlers into per-resource Express routers under `server/src/routes/`,
mounted from a slim `index.ts` that keeps only app/middleware wiring:

```
server/src/
  index.ts              # app setup, middleware, mounts routers, error handler
  routes/
    auth.routes.ts
    items.routes.ts
    pickLists.routes.ts
    admin.routes.ts
    ...
  controllers/ (optional) # if handlers get large, split logic out of routers
```

Each router imports the shared services (`db`, `email`, `stripe`) and middleware
(`requireAuth`, `enforceItemLimit`, …) that already exist — the wiring is already
service-oriented, so extraction is mostly mechanical.

## Why this is deferred (not done in the overhaul pass)

Moving 5,000 lines by hand with **only `tsc` as a safety net** risks silent
behavioral regressions in a live, production app (auth, billing webhooks, plan
enforcement). The responsible sequence is:

1. **First, add characterization tests** for the highest-risk routers
   (`auth`, `billing`, `pick-lists`) — enough to prove behavior is preserved.
   The overhaul added the test harness (Vitest) and pure-logic tests; route-level
   tests are the next investment.
2. **Then extract one router at a time**, running `npm run typecheck && npm test`
   after each, keeping each extraction a small, reviewable PR.

Order to extract (lowest-risk → highest): `feedback`, `org`, `tags`,
`notifications`, `folders`, `items`, `team`, `stock-counts`, `purchase-orders`,
`pick-lists`, `admin`, `auth`, `billing`.

## Related follow-ups surfaced during the overhaul

- **Web bundle is a single >500 KB chunk.** Route-level `React.lazy` +
  `<Suspense>` in `react-router` would cut initial load materially.
- **Store/Context files** trip `react-refresh/only-export-components` and
  `react-hooks/set-state-in-effect` (currently warnings). Splitting the hook from
  the provider (e.g. `useStore` → `useStore.ts` + `StoreProvider.tsx`) clears
  them and improves fast-refresh.
- **`Date.now()` during render** in `Dashboard`/`Workflows` (flagged by
  `react-hooks/purity`) should move into `useMemo`/state.
