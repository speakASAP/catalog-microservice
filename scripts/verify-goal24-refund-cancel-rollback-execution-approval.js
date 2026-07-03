#!/usr/bin/env node
const fs = require('fs');
const assert = require('assert');

const read = (file) => fs.readFileSync(file, 'utf8');
const packet = read('docs/orchestrator/2026-07-03-goal24-paid-provider-smoke-approval-packet.md');
const report = read('reports/validation/VAL-GOAL-24-paid-provider-approval-packet-final-readiness.md');
const state = read('docs/IMPLEMENTATION_STATE.md');
const status = read('docs/orchestrator/STATUS.md');
const linkageReport = read('reports/validation/VAL-GOAL-24-manual-refund-linkage-readback.md');

const requiredMarkers = [
  '## Refund/Cancel Rollback Execution Approval Decision',
  'This packet does not authorize any refund, cancel, void, reversal, live checkout, provider redirect, webhook replay, Orders mutation, Warehouse mutation, or channel cleanup beyond the retained owner-confirmed 1 CZK Fiobanka evidence payment.',
  '[MISSING: owner-approved refund/cancel rollback execution approval for future paid/provider smoke beyond the retained 1 CZK Fiobanka evidence payment]',
  '[RESOLVED/NARROWED: redacted runtime evidence packet captured a real bank-originated CZK transaction-polling match for the retained Goal 24 variable symbol hash d7512419521d2cab without token or raw payload output]',
  '[RESOLVED/NARROWED: deployed ready Payments pod has FIO_BANKA_WEBHOOK_SECRET present and healthy without secret output]',
  '[MISSING: named Payments/provider rollback execution owner]',
  '[MISSING: owner-approved Orders cancellation/refund correction actor, reason, sideEffectsHandled acknowledgement, and route]',
  '[MISSING: side-effectful rollback run id and cleanup idempotency keys]',
  '[RESOLVED/NARROWED: owner-confirmed manual Fiobanka refund was executed through the external refund service; automated Payments Fiobanka refund remains fail-closed]',
  '[MISSING: sanitized exact-order linkage between the manual refund confirmation and the Goal 24 completed Fiobanka smoke order]',
  '[MISSING: FlipFlop runtime readback showing the exact smoke order acknowledged as status=refunded and paymentStatus=refunded after manual refund]',
  '[RESOLVED/NARROWED: sanitized runtime readback found completed Fiobanka provider-payment evidence but no central Orders or FlipFlop exact-order linkage for the retained Goal 24 payment]',
  '[RESOLVED: owner accepted owner-confirmed manual Fiobanka refund as sufficient Goal 24 closeout without exact order linkage]',
  '[MISSING: renewed owner-approved execution window for Europe/Prague after 2026-07-03T23:59:59+02:00]',
  '[MISSING: named admin/actor or approved token-handling path for guarded discount-code generation]',
  '[MISSING: named runtime validation owner for the exact side-effectful smoke]',
  '[RESOLVED/NARROWED: runtime readback found no linked central Orders or FlipFlop state, so no Orders/Warehouse post-paid correction is required for this evidence-only closeout]',
  'For Fiobanka QR, the only currently source-supported side-effect-safe rollback is stop-before-paid',
  'A refund alone is not Warehouse return evidence.',
  'Stop before provider refund/cancel/reversal if the provider operation, provider owner, evidence redaction path, and amount ceiling are not explicitly recorded.',
  'Owner approval boundary: the current owner approval covers self-discovery, packet fill, and read-only/preflight verification only.',
];

for (const marker of requiredMarkers) {
  assert(packet.includes(marker), `approval packet missing marker: ${marker}`);
}

for (const [label, source] of [
  ['validation report', report],
  ['implementation state', state],
  ['orchestrator status', status],
]) {
  assert(source.includes('[MISSING: owner-approved refund/cancel rollback execution approval for future paid/provider smoke beyond the retained 1 CZK Fiobanka evidence payment]'), `${label} missing rollback execution blocker`);
  assert(source.includes('[RESOLVED/NARROWED: owner-confirmed manual Fiobanka refund was executed through the external refund service; automated Payments Fiobanka refund remains fail-closed]'), `${label} missing owner-confirmed manual refund execution marker`);
  assert(source.includes('[RESOLVED: owner accepted owner-confirmed manual Fiobanka refund as sufficient Goal 24 closeout without exact order linkage]'), `${label} missing owner accepted no-linkage closeout marker`);
  assert(source.includes('[RESOLVED/NARROWED: sanitized runtime readback found completed Fiobanka provider-payment evidence but no central Orders or FlipFlop exact-order linkage for the retained Goal 24 payment]'), `${label} missing sanitized no-linkage readback marker`);
  assert(source.includes('[MISSING: renewed owner-approved execution window for Europe/Prague after 2026-07-03T23:59:59+02:00]'), `${label} missing renewed execution window blocker`);
  assert(source.includes('[MISSING: named admin/actor or approved token-handling path for guarded discount-code generation]'), `${label} missing discount fixture admin/token blocker`);
  assert(source.includes('[RESOLVED/NARROWED: runtime readback found no linked central Orders or FlipFlop state, so no Orders/Warehouse post-paid correction is required for this evidence-only closeout]'), `${label} missing no correction required marker`);
  assert(source.includes('No live checkout, provider call, webhook replay, refund/cancel/reversal, Orders mutation, Warehouse mutation, channel cleanup, deploy, migration, DB mutation, or secret output occurred'), `${label} missing non-mutation boundary`);
}

assert(packet.includes('`release` for active reserved-only holds'), 'Warehouse reserved-only release mapping missing');
assert(packet.includes('`cancel` for approved fulfilled/stock-decremented cancellation'), 'Warehouse fulfilled cancel mapping missing');
assert(packet.includes('`return` for approved physical return'), 'Warehouse return mapping missing');
assert(packet.includes('Exact FlipFlop/customer-visible cleanup'), 'FlipFlop channel cleanup ownership missing');
assert(packet.includes('one Payments idempotency key anchored to the central Orders UUID'), 'Payments idempotency requirement missing');

assert(!packet.includes('[MISSING: runtime FIO_BANKA_WEBHOOK_SECRET configuration and deployment verification]'), 'approval packet still has stale runtime HMAC blocker');
assert(!report.includes('[MISSING: runtime FIO_BANKA_WEBHOOK_SECRET configuration and deployment verification]'), 'validation report still has stale runtime HMAC blocker');
assert(!packet.includes('[MISSING: runtime FIO_BANKA_API_KEY read-token configuration and owner-approved polling run evidence]'), 'approval packet still has stale runtime polling-token blocker');
assert(!report.includes('[MISSING: runtime FIO_BANKA_API_KEY read-token configuration and owner-approved polling run evidence]'), 'validation report still has stale runtime polling-token blocker');
assert(report.includes('Retained Evidence Closeout Supersession'), 'validation report missing retained evidence closeout supersession section');
assert(report.includes('future-only gates for new linked paid/provider smokes'), 'validation report must mark exact-linkage blockers as future-only after closeout');

for (const marker of [
  '[MISSING: renewed owner-approved execution window for Europe/Prague after 2026-07-03T23:59:59+02:00]',
  '[MISSING: named admin/actor or approved token-handling path for guarded discount-code generation]',
  '[MISSING: named runtime validation owner for the exact side-effectful smoke]',
  '[MISSING: named FlipFlop channel cleanup executor]',
  'FlipFlop `1409c18 docs: update Goal 24 discount fixture to reflect recalculated amount of 2117.58 CZK for tax-inclusive total`',
  'Orders `a1f1428 Merge goal24 orders idempotency runtime evidence`',
  'Payments `224aaf8 docs: align fiobanka polling rollback contract`',
]) {
  assert(report.includes(marker) || state.includes(marker) || status.includes(marker), `current exact linked paid-flow gate missing marker: ${marker}`);
}
console.log('Goal 24 refund/cancel rollback execution approval gate verified');

for (const marker of ['[RESOLVED/NARROWED: sanitized runtime readback found completed Fiobanka provider-payment evidence but no central Orders or FlipFlop exact-order linkage for the retained Goal 24 payment]', '[RESOLVED: owner accepted owner-confirmed manual Fiobanka refund as sufficient Goal 24 closeout without exact order linkage]', '[RESOLVED/NARROWED: runtime readback found no linked central Orders or FlipFlop state, so no Orders/Warehouse post-paid correction is required for this evidence-only closeout]', 'completed Fiobanka rows checked: `2`', 'Orders lookup', 'FlipFlop readback']) {
  assert(linkageReport.includes(marker), `manual refund linkage report missing marker: ${marker}`);
}
