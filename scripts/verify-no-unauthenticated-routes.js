#!/usr/bin/env node
/**
 * Asserts that no controller route is reachable without CatalogAuthGuard, except an
 * explicit allowlist of routes that are intentionally public.
 *
 * Why this exists: on 2026-09-01 three routes were found readable from the public
 * internet with no credentials, because the catalog ingress maps `/api` to this
 * service and those routes carried no guard. One of them
 * (`GET /products/:id/heureka-feed-snapshot`) sat among 31 guarded siblings.
 *
 * Why it is written this way: two independently written coverage scanners both got
 * this wrong, and one reported the unguarded route as protected. Their defects were
 * all the same family — the pattern matched something structurally adjacent to the
 * target:
 *
 *   - scanning backwards from the HTTP-verb line (decorators sit AFTER the verb)
 *   - treating "everything above the class" as class decorators, which swallows the
 *     import block for the FIRST class in a file
 *   - matching `class` instead of `@Controller`, so a DTO counts as a controller
 *
 * So this script anchors on `@Controller(` for class spans and scans FORWARD from
 * each verb line, and it fails closed: an unrecognised route is a failure, not a
 * pass. A false negative here would re-certify an exposure as safe, which is worse
 * than having no check at all.
 *
 * This is a source-level backstop. It is NOT authoritative for enforcement — only a
 * probe against the deployed pod is. It exists to catch a regression at commit time.
 */
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'src');

/**
 * Routes deliberately served without authentication. Each needs a reason.
 * Adding to this list is a security decision, not a formality.
 */
const INTENTIONALLY_PUBLIC = new Set([
  'GET /health',              // Kubernetes liveness probe
  'GET /ready',               // Kubernetes readiness probe
  'POST /auth/login',         // issues credentials; cannot require them
  'POST /auth/register',      // public sign-up
  // Authenticated in the HANDLER BODY, not by the guard: both reject a missing or
  // non-Bearer Authorization header themselves. Verified live — each returns 401 to
  // an anonymous caller. Listed here because this script checks for the guard, and
  // a handler-level check is invisible to it. That invisibility is itself a hazard:
  // an access rule that lives in a handler body cannot be audited by reading
  // decorators, so prefer the guard for new routes.
  'GET /auth/profile',
  'GET /auth/admin/users',
  // Read-only catalogue browsing. These controllers guard every write and leave
  // reads open — a consistent, pre-existing product decision, not an oversight.
  'GET /attributes',
  'GET /attributes/:id',
  'GET /categories',
  'GET /categories/tree',
  'GET /categories/:id',
  'GET /media/product/:productId',
  'GET /pricing/product/:productId',
  'GET /pricing/product/:productId/current',
]);

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith('.controller.ts')) out.push(full);
  }
  return out;
}

const VERB = /^\s*@(Get|Post|Put|Patch|Delete)\(\s*(?:['"]([^'"]*)['"])?/;
const CONTROLLER = /^\s*@Controller\(\s*(?:['"]([^'"]*)['"])?/;

const unguarded = [];

for (const file of walk(SRC)) {
  const lines = fs.readFileSync(file, 'utf8').split('\n');

  // Class spans anchored on @Controller, not on `class` — a DTO is not a controller.
  const starts = [];
  lines.forEach((line, i) => {
    const m = CONTROLLER.exec(line);
    if (m) starts.push({ line: i, prefix: m[1] || '' });
  });

  const spans = starts.map((s, n) => {
    const end = n + 1 < starts.length ? starts[n + 1].line : lines.length;
    // Class-level decorators sit between @Controller and the class declaration.
    let head = '';
    for (let j = s.line; j < Math.min(s.line + 8, lines.length); j += 1) {
      head += lines[j] + '\n';
      if (/^\s*export\s+class\s/.test(lines[j])) break;
    }
    return { start: s.line, end, prefix: s.prefix, classGuarded: head.includes('CatalogAuthGuard') };
  });

  lines.forEach((line, i) => {
    const m = VERB.exec(line);
    if (!m) return;
    const span = spans.find((s) => i >= s.start && i < s.end);
    if (!span) return;

    // Scan FORWARD from the verb line: decorators come after it.
    const window = lines.slice(i, i + 8).join('\n');
    if (span.classGuarded || window.includes('CatalogAuthGuard')) return;

    const route = `/${span.prefix}/${m[2] || ''}`.replace(/\/+/g, '/').replace(/\/$/, '') || '/';
    const key = `${m[1].toUpperCase()} ${route}`;
    if (INTENTIONALLY_PUBLIC.has(key)) return;

    unguarded.push({ key, file: path.relative(SRC, file), line: i + 1 });
  });
}

if (unguarded.length > 0) {
  console.error('Unauthenticated routes found. The catalog ingress maps /api to this');
  console.error('service, so an unguarded route under /api is readable from the public');
  console.error('internet. Add CatalogAuthGuard, or add the route to');
  console.error('INTENTIONALLY_PUBLIC with a reason if anonymous access is deliberate.\n');
  for (const u of unguarded) {
    console.error(`  ${u.key}\n      ${u.file}:${u.line}`);
  }
  process.exit(1);
}

console.log('verify-no-unauthenticated-routes: no unguarded routes outside the allowlist');
