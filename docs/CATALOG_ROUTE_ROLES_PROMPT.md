# Catalog route authorization — decorate the routes, then split the service roles

Work in `/home/ssf/Documents/Github/catalog-microservice`. This is a **two-phase** task and
the order is not negotiable: phase 2 breaks production if phase 1 is not finished and
verified first.

Read `auth-microservice/docs/RS256_SERVICE_TOKEN_MIGRATION_PLAN.md` section **6af** (Session
E) before starting — particularly "Header-chosen identity closed on catalog". Do not read the
whole file, it is very long.

---

## The problem

`CatalogAuthGuard` synthesises a fixed role set for every caller that presents the shared
internal-service secret:

```ts
// src/auth/catalog-auth.guard.ts, resolveInternalServiceActor()
roles: ['internal:catalog-microservice:admin', 'catalog:write']
```

Eleven services get catalog **admin + write** because they hold one shared 64-character
opaque secret (`5f420714`, mounted 8 times). Most of them only read. That is the over-grant
to close.

### Why it cannot be done directly — measure this yourself before believing it

**41 of 81 guarded routes carry no `@RequireCatalogRoles` decorator.** They fall through to
`CatalogAuthGuard.defaultWriteRoles`, which *is*
`['global:superadmin', 'global:platform_admin', 'app:catalog-microservice:admin',
'internal:catalog-microservice:admin', 'catalog:write']`.

So removing those two roles from a caller does not narrow it to read-only — it **403s that
caller on routes it uses in production today**, including plain reads:

| Route | As service actor now | With roles narrowed |
| --- | --- | --- |
| `GET /api/pricing/product/:id/current` | 200 | 403 |
| `GET /api/media/product/:id` | 200 | 403 |
| `GET /api/categories` | 200 | 403 |

Verified live from the bazos pod, 2026-09-01. Reproduce it before you trust it.

Route inventory as measured (re-measure; it will have moved):

```
81 guarded routes
  41  fall back to defaultWriteRoles   <- the problem
  36  @RequireCatalogRoles('catalog:authenticated')
   3  ...PRODUCT_RELATION_ADMIN_ROLES
   1  'global:superadmin'
```

Note `PRODUCT_RELATION_ADMIN_ROLES` and `BUNDLE_ADMIN_ROLES` both contain
`internal:catalog-microservice:admin` — the role phase 2 removes. Those routes need a
deliberate decision, not a mechanical edit.

---

## Phase 1 — give every guarded route an honest role requirement

Decorate all 41 undecorated routes. **Do not** simply stamp `catalog:authenticated` on
everything; that trades an over-grant for an under-guard. For each route decide:

- **read, non-sensitive** → `catalog:authenticated`
- **write / mutation** → a real write role (`catalog:write` and/or the admin set)
- **admin/config surface** (`/catalog/settings`, `/catalog/access/provision`) → keep the
  admin set

`GET /api/catalog/settings` already returns **403** to a service actor today, which tells you
it is genuinely admin-only. Preserve that.

The 41 span: `attributes`, `categories`, `pricing`, `media`, `product-relations`,
`marketplace-fields`, `content-previews`, `bundles`, `catalog-access`,
`warehouse-availability`, `flipflop-projection`, `import-reconciliation`, `products`,
`product-import`. Enumerate them yourself:

```bash
grep -rn "@RequireCatalogRoles" src --include=*.controller.ts | wc -l
# then find @Get/@Post/@Put/@Patch/@Delete with no decorator between the method
# and the handler signature -- note the decorator sits AFTER @Post(), not before
```

**A decorator-position trap that already cost one session a wrong answer:** the role
decorator appears *below* the HTTP-method decorator and *above* the handler. A scan that
looks backwards from the method line reports 81/81 undecorated, which is wrong.

### Phase 1 exit criteria

- Zero guarded routes rely on `defaultWriteRoles`. Consider making that fallback **deny**
  once nothing depends on it — a route that forgets its decorator should fail closed, not
  silently inherit admin.
- All existing tests green, plus a test per newly-decorated route class.
- **Deployed, and every one of the 11 callers re-probed live.** Phase 1 alone must not change
  any caller's effective access — it only makes the existing requirement explicit. If a
  caller's status changes in phase 1, you have mis-assigned a route; fix it before phase 2.

---

## Phase 2 — per-caller roles

Only after phase 1 is deployed and verified. Replace the fixed role set with a per-caller
map keyed on the (now validated) `x-service-name`.

Callers, with what they actually do — **re-verify, do not inherit this table**:

| Caller | Writes to catalog? | Evidence |
| --- | --- | --- |
| `allegro-service` | yes | `POST /api/products`, `/api/media`, `/api/pricing` |
| `bazos-service` | yes | `POST /api/products`, `/api/media/upload`, `PUT /api/products/:id` — all three have live callers |
| `heureka-service` | yes | `POST /api/catalog/access/provision`, `POST /api/products` |
| `orders-microservice` | yes | `POST /api/pricing` (`pricing.service.ts:503`) |
| `flipflop-*` (4 names) | check | uses `/api/products`, `/api/pricing`, `/api/bundles`, `/api/categories` |
| `marketing-microservice` | check | `POST /api/internal/product-relations/order-affinity/replace-window` |
| `cliplot` | appears read-only | `GET /api/products`, `GET /api/products/:id` |
| `catalog-microservice` | self-call | its own flipflop-projection batch route |

Reader-only callers should end up with something like `catalog:read` /
`catalog:authenticated` and **no** `catalog:write`, no admin.

### Phase 2 exit criteria

- No caller holds `internal:catalog-microservice:admin` unless it demonstrably needs it.
- Every caller re-probed live from its own pod, read **and** write paths.
- A test proving a read-only caller is **403** on a write route — and confirm it fails when
  you revert the map.

---

## Hard constraints

- **Never log, echo, print or commit a token value.** Fingerprints only, first 8 chars.
- **Never let `kubectl` emit a Secret's `.data` wholesale.** Key names only.
- Deploys are serialised. Check `shared/scripts/deploy-queue/queuectl.sh status` and
  `shared/scripts/with-deploy-lock.sh --status`. Committing to `main` auto-deploys.
  Any container-creating command goes through `shared/scripts/with-deploy-lock.sh <cmd>`.
- **Reproduce from inside the deployed pod before claiming a fix.** A `FAILED` line after
  ~600s is usually a rollout timeout — check pod image and readiness before re-running.
- **Verify a deploy by pod age vs commit time, then grep the pod's `dist/` for an emitted
  string.** The build strips comments, so grepping for a comment you wrote returns 0 on a
  correctly deployed pod and looks exactly like a stale image.
- After a rollout, **two pods can be Running briefly**; a naive "first pod" helper returns the
  terminating one. Check ReplicaSet replica counts before concluding a value did not
  propagate.
- No silent failures: every catch re-throws or logs at error level with full context.
  **A 404 legitimately means "no rows"; 401/403/5xx do not.**
- If you add a test, confirm it **fails** when you revert the fix.
- `401` only proves the credential is wrong *for the endpoint you asked*. Resolve the
  caller's own target from its dispatch code before declaring a lane dead.

## Probing

Probe from inside a caller's pod, against a non-existent id, never mutating real data:

```bash
kubectl exec -n statex-apps <caller-pod> -c app -- node -e '
const T=process.env.CATALOG_INTERNAL_SERVICE_TOKEN||"";
(async()=>{const r=await fetch("http://catalog-microservice:3200/api/products?limit=1",
 {headers:{"x-internal-service-token":T,"x-service-name":"<name>"}});
 console.log(r.status);})();'
```

Catalog is on port **3200**. `200`/`404`/`400` mean authorized; `401`/`403` mean denied.
Pods have no `curl` — use `node -e` with `fetch`.

## Out of scope

- Do **not** change which credential the callers present, and do not split `5f420714` into
  per-caller secrets. That is provisioning work tracked separately in the RS256 plan, and it
  is 8 mounts across 5 repos.
- Do not touch `catalog-auth.guard.ts`'s allowlist (`allowedInternalServiceNames`) except to
  add a caller you have verified by **holder** — see 6af for the five ways that enumeration
  goes wrong.
- Do not reconcile catalog's live-vs-git ExternalSecret drift (`WAREHOUSE_SERVICE_TOKEN`
  points at a different Vault path live than in git). Known, recorded in 6af, deliberately
  left alone.

## Report

Per phase: what changed, the route/role table before and after, live probe results for all
11 callers, and a test that fails on revert. Append a numbered section to
`auth-microservice/docs/RS256_SERVICE_TOKEN_MIGRATION_PLAN.md` — **check the highest existing
`## 6<letters>` first**, several sessions append concurrently and letters have collided
repeatedly (`6z` was used twice, `6aa` twice).
