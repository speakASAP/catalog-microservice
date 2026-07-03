#!/usr/bin/env node
const fs = require('fs');
const assert = require('assert');

const read = (file) => fs.readFileSync(file, 'utf8');
const packet = read('docs/orchestrator/2026-07-03-goal24-paid-provider-smoke-approval-packet.md');
const report = read('reports/validation/VAL-GOAL-24-paid-provider-approval-packet-final-readiness.md');
const state = read('docs/IMPLEMENTATION_STATE.md');
const status = read('docs/orchestrator/STATUS.md');

const requiredMarkers = [
  '## Refund/Cancel Rollback Execution Approval Decision',
  'This packet does not authorize any refund, cancel, void, reversal, live checkout, provider redirect, webhook replay, Orders mutation, Warehouse mutation, or channel cleanup beyond the retained owner-confirmed 1 CZK Fiobanka evidence payment.',
  '[MISSING: owner-approved refund/cancel rollback execution approval for future paid/provider smoke beyond the retained 1 CZK Fiobanka evidence payment]',
  '[MISSING: named Payments/provider rollback execution owner]',
  '[MISSING: owner-approved Orders cancellation/refund correction actor, reason, sideEffectsHandled acknowledgement, and route]',
  '[MISSING: side-effectful rollback run id and cleanup idempotency keys]',
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
  assert(source.includes('No live checkout, provider call, webhook replay, refund/cancel/reversal, Orders mutation, Warehouse mutation, channel cleanup, deploy, migration, DB mutation, or secret output occurred'), `${label} missing non-mutation boundary`);
}

assert(packet.includes('`release` for active reserved-only holds'), 'Warehouse reserved-only release mapping missing');
assert(packet.includes('`cancel` for approved fulfilled/stock-decremented cancellation'), 'Warehouse fulfilled cancel mapping missing');
assert(packet.includes('`return` for approved physical return'), 'Warehouse return mapping missing');
assert(packet.includes('Exact FlipFlop/customer-visible cleanup'), 'FlipFlop channel cleanup ownership missing');
assert(packet.includes('one Payments idempotency key anchored to the central Orders UUID'), 'Payments idempotency requirement missing');

console.log('Goal 24 refund/cancel rollback execution approval gate verified');
