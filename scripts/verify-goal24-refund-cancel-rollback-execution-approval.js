#!/usr/bin/env node
const fs = require('fs');
const assert = require('assert');

const read = (file) => fs.readFileSync(file, 'utf8');
const packet = read('docs/orchestrator/2026-07-03-goal24-paid-provider-smoke-approval-packet.md');
const report = read('reports/validation/VAL-GOAL-24-paid-provider-approval-packet-final-readiness.md');
const state = read('docs/IMPLEMENTATION_STATE.md');
const status = read('docs/orchestrator/STATUS.md');
const linkageReport = read('reports/validation/VAL-GOAL-24-manual-refund-linkage-readback.md');
const flipflopChannelSupersessionReport = read('reports/validation/VAL-GOAL-24-flipflop-channel-supersession-consumption-2026-07-04.md');
const ordersPaymentsHeadSyncReport = read('reports/validation/VAL-GOAL-24-orders-payments-head-sync-2026-07-04.md');
const currentHeadSyncReport = read('reports/validation/VAL-GOAL-24-current-head-sync-2026-07-04.md');
const flipflopTokenBindingContractConsumption = read('reports/validation/VAL-GOAL-24-flipflop-token-binding-proof-contract-consumption-2026-07-04.md');
const finalTokenBindingHeadSync = read('reports/validation/VAL-GOAL-24-final-token-binding-head-sync-2026-07-04.md');
const warehouseTargetFactsSync = read('reports/validation/VAL-GOAL-24-warehouse-target-facts-sync-2026-07-04.md');
const catalogChannelOwnerConfigCurrentSync = read('reports/validation/VAL-GOAL-24-catalog-channel-owner-config-current-sync-2026-07-04.md');
const catalogOwnerExecutorWordingSync = read('reports/validation/VAL-GOAL-24-catalog-owner-executor-wording-sync-2026-07-04.md');
const flipflopAutonomousRuntimeOwnership = read('../flipflop/reports/validation/VAL-GOAL-24-autonomous-runtime-ownership-packet-2026-07-04.md');
const flipflopPaymentResultUrlReadback = read('../flipflop/reports/validation/VAL-GOAL-24-payment-result-url-runtime-readback.md');
const warehouseCleanupPacket = read('../warehouse-microservice/docs/contracts/goal24-warehouse-cleanup-approval-packet.md');
const paymentsTokenBindingConsumption = read('../payments-microservice/reports/validation/VAL-GOAL-24-payments-token-binding-proof-contract-consumption-2026-07-04.md');
const ordersTokenBindingConsumption = read('../orders-microservice/reports/validation/VAL-GOAL-24-orders-token-binding-proof-contract-consumption-2026-07-04.md');

const flipflopChannelSupersessionMarker = '[RESOLVED/NARROWED: Codex Goal 24 integration thread supersedes earlier FlipFlop channel executor/runtime owner blockers; channel cleanup runtime remains blocked until bank/refund authority, exact provider proof, Orders side-effect acknowledgements, Warehouse target facts, Auth token source, and final redacted evidence path exist]';
const sourceWaveFreezeMarker = '[RESOLVED/NARROWED: Goal 24 frozen source-governance wave GOAL24-SOURCE-WAVE-2026-07-04A records Catalog `e379b54 merge goal24 current source head sync`, FlipFlop `e1f3e3a merge goal24 current source head sync`, Payments `eab6351 merge goal24 current source head sync`, Orders `d53de9f merge goal24 current source head sync`, and Warehouse `11df002 merge goal24 warehouse target facts reconcile` as input heads for runtime planning; post-merge self heads are validation evidence only; runtime side effects remain blocked]';

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
  '[MISSING: Vault properties FIO_BANKA_PAYMENT_ORDER_TOKEN_CZK and FIO_BANKA_PAYMENT_ORDER_TOKEN_EUR for owner-approved payment-order upload]',
  '[RESOLVED/NARROWED: owner delegated autonomous Goal 24 continuation to Codex, but integration validation keeps new Fiobanka paid/provider side effects hard-stopped until bank/refund authority, exact Orders/Warehouse packet, and redacted provider proof exist]',
  '[RESOLVED/NARROWED: Codex Goal 24 integration thread is the runtime validation owner and FlipFlop channel cleanup executor for future source-controlled smoke coordination; runtime side effects remain blocked until bank/refund authority, exact provider proof, Orders/Warehouse packets, and redacted evidence path exist]',
  '[RESOLVED/NARROWED: sanitized Auth readback found one active verified Goal 24 actor hash 4215870ba488de17 with app:flipflop-service:admin and no token/raw email/user id output]',
  '[MISSING: approved token source path, such as an on-host token file path or in-memory handoff, with explicit no-print/no-decode/no-persist handling]',
  '[MISSING: confirmation that the token belongs to actor hash 4215870ba488de17 and carries app:flipflop-service:admin or global:superadmin]',
  '[RESOLVED/NARROWED: Codex Goal 24 integration thread is the runtime validation owner for future source-controlled smoke coordination; runtime side effects remain blocked until bank/refund authority, exact provider proof, Orders/Warehouse packets, Fiobanka payment-order Vault write tokens, and redacted evidence path exist]',
  '[RESOLVED/NARROWED: runtime readback found no linked central Orders or FlipFlop state, so no Orders/Warehouse post-paid correction is required for this evidence-only closeout]',
  'For Fiobanka QR, the only currently source-supported side-effect-safe rollback is stop-before-paid',
  'A refund alone is not Warehouse return evidence.',
  'Stop before provider refund/cancel/reversal if the provider operation, provider owner, evidence redaction path, and amount ceiling are not explicitly recorded.',
  'Owner approval boundary: the current owner approval covers self-discovery, packet fill, and read-only/preflight verification only.',
  'Catalog consumed FlipFlop `5202c15 merge goal24 channel cleanup owner supersession`',
  flipflopChannelSupersessionMarker,
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
  assert(source.includes('[MISSING: Vault properties FIO_BANKA_PAYMENT_ORDER_TOKEN_CZK and FIO_BANKA_PAYMENT_ORDER_TOKEN_EUR for owner-approved payment-order upload]'), `${label} missing Fiobanka payment-order Vault blocker`);
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
  '[RESOLVED/NARROWED: Catalog consumed FlipFlop f004fe5 token-binding proof contract as source governance only; runtime Auth token source and token-to-actor proof remain blocked]',
  '[RESOLVED/NARROWED: Goal 24 token-binding proof may record only token-present, Auth validation status class, actor-hash match, required-role boolean, approval id, runner id, timestamps, and no-output booleans]',
  '[RESOLVED/NARROWED: Goal 24 approved token source shape is owner-approved on-host token file or in-memory handoff read only by the approved runner, never printed, never decoded into reports, never persisted, never committed, and removed or invalidated after the run]',
  '[RESOLVED/NARROWED: Goal 24 Auth token binding does not authorize Orders, Warehouse, Payments/provider, or channel side effects and does not prove stock effects]',
  '[MISSING: approved token source path, such as an on-host token file path or in-memory handoff, with explicit no-print/no-decode/no-persist handling]',
  '[MISSING: confirmation that the token belongs to actor hash 4215870ba488de17 and carries app:flipflop-service:admin or global:superadmin]',
  '[MISSING: sanitized auth/admin evidence path for guarded discount-code generation]',
  'tokenSourceType=on-host-token-file',
  'tokenSourceType=in-memory-handoff',
  'actorHashMatches=true',
  'requiredAdminRolePresent=true',
  'tokenOutput=false',
  'decodedJwtOutput=false',
  'rawUserOutput=false',
  'secretOutput=false',
  'tokenSourceDestroyedOrInvalidated=true',
  'Auth token-binding proof is not Warehouse stock evidence and is not Orders cleanup authorization',
]) {
  assert(flipflopTokenBindingContractConsumption.includes(marker), `FlipFlop token-binding consumption report missing ${marker}`);
  assert(packet.includes(marker) || state.includes(marker) || status.includes(marker), `Catalog docs missing token-binding consumption marker ${marker}`);
}
for (const boundary of [
  'mutation: false',
  'live_auth_login: false',
  'token_issuance: false',
  'token_output: false',
  'decoded_jwt_output: false',
  'secret_output: false',
  'raw_user_output: false',
  'provider_call: false',
  'live_checkout_executed: false',
  'orders_mutation: false',
  'warehouse_mutation: false',
  'channel_cleanup_mutation: false',
]) {
  assert(flipflopTokenBindingContractConsumption.includes(boundary), `FlipFlop token-binding consumption report missing boundary ${boundary}`);
}

for (const [label, source] of [
  ['source-wave freeze report', currentHeadSyncReport],
  ['approval packet', packet],
  ['implementation state', state],
  ['orchestrator status', status],
]) {
  assert(source.includes(sourceWaveFreezeMarker), `${label} missing source-wave freeze marker`);
  for (const marker of [
    'Catalog `e379b54 merge goal24 current source head sync`',
    'FlipFlop `e1f3e3a merge goal24 current source head sync`',
    'Payments `eab6351 merge goal24 current source head sync`',
    'Orders `d53de9f merge goal24 current source head sync`',
    'Warehouse `11df002 merge goal24 warehouse target facts reconcile`',
    '[MISSING: approved token source path, such as an on-host token file path or in-memory handoff, with explicit no-print/no-decode/no-persist handling]',
    '[MISSING: confirmation that the token belongs to actor hash 4215870ba488de17 and carries app:flipflop-service:admin or global:superadmin]',
    '[MISSING: named human Payments/provider rollback execution owner with bank/refund authority for runtime]',
    '[MISSING: future paymentId/orderId/variableSymbolHash/providerTransactionHash for exact smoke]',
    '[MISSING: concrete side-effectful rollback run id and cleanup idempotency keys]',
    '[MISSING: exact Orders cleanup packet and sideEffectsHandled acknowledgements]',
    '[MISSING: renewed owner-approved execution window and Warehouse hold/release duration]',
    '[MISSING: final owner approval before any live Warehouse reservation/cleanup mutation]',
    '[MISSING: final redacted evidence path for required provider, Orders, Warehouse, and channel cleanup proof]',
  ]) {
    assert(source.includes(marker), `${label} missing source-wave freeze marker ${marker}`);
  }
}
for (const boundary of [
  'mutation: false',
  'live_checkout_executed: false',
  'provider_call: false',
  'orders_mutation: false',
  'warehouse_mutation: false',
  'channel_cleanup_mutation: false',
  'deployment: false',
  'secret_output: false',
  'raw_customer_or_payment_evidence: false',
]) {
  assert(currentHeadSyncReport.includes(boundary), `source-wave freeze report missing boundary ${boundary}`);
}

for (const marker of [
  '[MISSING: renewed owner-approved execution window for Europe/Prague after 2026-07-03T23:59:59+02:00]',
  '[MISSING: Vault properties FIO_BANKA_PAYMENT_ORDER_TOKEN_CZK and FIO_BANKA_PAYMENT_ORDER_TOKEN_EUR for owner-approved payment-order upload]',
  '[RESOLVED/NARROWED: owner delegated autonomous Goal 24 continuation to Codex, but integration validation keeps new Fiobanka paid/provider side effects hard-stopped until bank/refund authority, exact Orders/Warehouse packet, and redacted provider proof exist]',
  '[RESOLVED/NARROWED: Codex Goal 24 integration thread is the runtime validation owner and FlipFlop channel cleanup executor for future source-controlled smoke coordination; runtime side effects remain blocked until bank/refund authority, exact provider proof, Orders/Warehouse packets, and redacted evidence path exist]',
  '[RESOLVED/NARROWED: sanitized Auth readback found one active verified Goal 24 actor hash 4215870ba488de17 with app:flipflop-service:admin and no token/raw email/user id output]',
  '[MISSING: approved token source path, such as an on-host token file path or in-memory handoff, with explicit no-print/no-decode/no-persist handling]',
  '[MISSING: confirmation that the token belongs to actor hash 4215870ba488de17 and carries app:flipflop-service:admin or global:superadmin]',
  '[RESOLVED/NARROWED: Codex Goal 24 integration thread is the runtime validation owner for future source-controlled smoke coordination; runtime side effects remain blocked until bank/refund authority, exact provider proof, Orders/Warehouse packets, Fiobanka payment-order Vault write tokens, and redacted evidence path exist]',
  '[RESOLVED/NARROWED: deployed FlipFlop bundle-preserving fixture gate and renewed runtime quote evidence passed before checkout]',
  '[RESOLVED/NARROWED: runtime config readback shows PAYMENT_SUCCESS_URL and PAYMENT_CANCEL_URL resolve to approved FlipFlop payment-result URLs without secret output]',
  'FlipFlop `5202c15 merge goal24 channel cleanup owner supersession`',
  'FlipFlop `1a79c6a docs: supersede goal24 channel cleanup owner blockers`',
  flipflopChannelSupersessionMarker,
  'Orders `3901ec1 merge goal24 latest cleanup head sync`',
  'Payments `7822f2a merge goal24 cross-service head sync`',
  '[RESOLVED/NARROWED: Warehouse owner-approved cleanup operation for reserved-only, fulfilled/stock-decremented, return, partial component failure, and timeout component-line states; max quantity and live hold/release window remain missing]',
]) {
  assert(report.includes(marker) || state.includes(marker) || status.includes(marker), `current exact linked paid-flow gate missing marker: ${marker}`);
}


for (const [label, source] of [
  ['orders/payments head sync report', ordersPaymentsHeadSyncReport],
  ['validation report', report],
]) {
  assert(source.includes('Orders `3901ec1 merge goal24 latest cleanup head sync`'), `${label} missing Orders 3901ec1 historical consumption`);
  assert(source.includes('Payments `7822f2a merge goal24 cross-service head sync`'), `${label} missing Payments 7822f2a historical consumption`);
  assert(source.includes('Catalog `906a31f merge goal24 flipflop channel supersession consumption`'), `${label} missing Catalog 906a31f historical consumption`);
}
for (const boundary of [
  'mutation: false',
  'live_checkout_executed: false',
  'provider_call: false',
  'orders_mutation: false',
  'warehouse_mutation: false',
  'channel_cleanup_mutation: false',
  'deployment: false',
  'secret_output: false',
  'raw_customer_or_payment_evidence: false',
]) {
  assert(ordersPaymentsHeadSyncReport.includes(boundary), `Orders/Payments head sync missing boundary ${boundary}`);
}

for (const [label, source] of [
  ['flipflop channel supersession report', flipflopChannelSupersessionReport],
  ['validation report', report],
]) {
  assert(source.includes(flipflopChannelSupersessionMarker), `${label} missing FlipFlop channel supersession marker`);
  assert(source.includes('FlipFlop `5202c15 merge goal24 channel cleanup owner supersession`') || source.includes('5202c15 merge goal24 channel cleanup owner supersession'), `${label} missing FlipFlop 5202c15 historical consumption`);
}
for (const [label, source] of [
  ['approval packet', packet],
  ['implementation state', state],
  ['orchestrator status', status],
]) {
  assert(source.includes(sourceWaveFreezeMarker), `${label} missing Catalog source-wave freeze marker`);
  assert(source.includes('FlipFlop `e1f3e3a merge goal24 current source head sync`'), `${label} missing frozen-wave FlipFlop e1f3e3a consumption`);
  assert(source.includes('Warehouse `11df002 merge goal24 warehouse target facts reconcile`'), `${label} missing current Warehouse 11df002 consumption`);
}
for (const marker of [
  '[MISSING: approved token source path, such as an on-host token file path or in-memory handoff, with explicit no-print/no-decode/no-persist handling]',
  '[MISSING: confirmation that the token belongs to actor hash 4215870ba488de17 and carries app:flipflop-service:admin or global:superadmin]',
  '[MISSING: named human Payments/provider rollback execution owner with bank/refund authority for runtime]',
  '[MISSING: future paymentId/orderId/variableSymbolHash/providerTransactionHash for exact smoke]',
  '[MISSING: concrete side-effectful rollback run id and cleanup idempotency keys]',
  '[MISSING: exact Orders cleanup packet and sideEffectsHandled acknowledgements]',
  '[MISSING: owner-approved Warehouse stock hold/release window, max quantity, target rows]',
  '[MISSING: Vault properties FIO_BANKA_PAYMENT_ORDER_TOKEN_CZK and FIO_BANKA_PAYMENT_ORDER_TOKEN_EUR for owner-approved payment-order upload]',
  '[MISSING: final redacted evidence path for required provider, Orders, Warehouse, and channel cleanup proof]',
]) {
  assert(flipflopChannelSupersessionReport.includes(marker), `FlipFlop channel supersession consumption missing blocker ${marker}`);
}
for (const boundary of [
  'mutation: false',
  'live_checkout_executed: false',
  'provider_call: false',
  'orders_mutation: false',
  'warehouse_mutation: false',
  'channel_cleanup_mutation: false',
  'deployment: false',
  'secret_output: false',
  'raw_customer_or_payment_evidence: false',
]) {
  assert(flipflopChannelSupersessionReport.includes(boundary), `FlipFlop channel supersession consumption missing boundary ${boundary}`);
}

for (const marker of [
  '[RESOLVED/NARROWED: Catalog consumed FlipFlop f004fe5 channel owner/config evidence as current source governance; live paid/provider side effects remain blocked]',
  '[RESOLVED/NARROWED: Codex Goal 24 integration thread is the runtime validation owner and FlipFlop channel cleanup executor for future source-controlled smoke coordination; runtime side effects remain blocked until bank/refund authority, exact provider proof, Orders/Warehouse packets, and redacted evidence path exist]',
  '[RESOLVED/NARROWED: runtime config readback shows PAYMENT_SUCCESS_URL and PAYMENT_CANCEL_URL resolve to approved FlipFlop payment-result URLs without secret output]',
  '[RESOLVED/NARROWED: FlipFlop channel cleanup executor is the Codex Goal 24 integration thread for future source-controlled coordination]',
]) {
  assert(catalogChannelOwnerConfigCurrentSync.includes(marker), `Catalog channel owner/config current sync missing ${marker}`);
  assert(packet.includes(marker) || report.includes(marker) || state.includes(marker) || status.includes(marker), `Catalog docs missing current channel owner/config marker ${marker}`);
}
assert(flipflopAutonomousRuntimeOwnership.includes('[RESOLVED/NARROWED: Codex Goal 24 integration thread is the runtime validation owner and FlipFlop channel cleanup executor for future source-controlled smoke coordination; runtime side effects remain blocked until bank/refund authority, exact provider proof, Orders/Warehouse packets, and redacted evidence path exist]'), 'FlipFlop autonomous runtime ownership source marker missing');
assert(flipflopPaymentResultUrlReadback.includes('[RESOLVED/NARROWED: runtime config readback shows PAYMENT_SUCCESS_URL and PAYMENT_CANCEL_URL resolve to approved FlipFlop payment-result URLs without secret output]'), 'FlipFlop payment result URL source marker missing');
assert(flipflopPaymentResultUrlReadback.includes('PAYMENT_SUCCESS_URL_STATE=set approved_payment_result_url'), 'FlipFlop success URL state missing');
assert(flipflopPaymentResultUrlReadback.includes('PAYMENT_CANCEL_URL_STATE=set approved_payment_result_url'), 'FlipFlop cancel URL state missing');
for (const boundary of [
  'mutation: false',
  'live_checkout_executed: false',
  'payment_creation: false',
  'provider_call: false',
  'refund_or_reversal: false',
  'orders_mutation: false',
  'warehouse_mutation: false',
  'channel_cleanup_mutation: false',
  'deployment: false',
  'secret_output: false',
  'token_output: false',
  'raw_customer_or_payment_evidence: false',
]) {
  assert(catalogChannelOwnerConfigCurrentSync.includes(boundary), `Catalog channel owner/config current sync missing boundary ${boundary}`);
}


for (const marker of ['[RESOLVED/NARROWED: sanitized runtime readback found completed Fiobanka provider-payment evidence but no central Orders or FlipFlop exact-order linkage for the retained Goal 24 payment]', '[RESOLVED: owner accepted owner-confirmed manual Fiobanka refund as sufficient Goal 24 closeout without exact order linkage]', '[RESOLVED/NARROWED: runtime readback found no linked central Orders or FlipFlop state, so no Orders/Warehouse post-paid correction is required for this evidence-only closeout]', 'completed Fiobanka rows checked: `2`', 'Orders lookup', 'FlipFlop readback']) {
  assert(linkageReport.includes(marker), `manual refund linkage report missing marker: ${marker}`);
}


const staleOwnerExecutorHardStops = [
  '- `[MISSING: named runtime validation owner for the exact side-effectful smoke]`.',
  '- `[MISSING: named FlipFlop channel cleanup executor]`.',
];
for (const [label, source] of [
  ['approval packet', packet],
  ['final readiness report', report],
]) {
  assert(source.includes('[RESOLVED/NARROWED: Codex Goal 24 integration thread is the runtime validation owner and FlipFlop channel cleanup executor for future source-controlled smoke coordination; runtime side effects remain blocked until bank/refund authority, exact provider proof, Orders/Warehouse packets, and redacted evidence path exist]'), `${label} missing current Codex coordination owner/executor marker`);
  assert(source.includes('[RESOLVED/NARROWED: FlipFlop channel cleanup executor is the Codex Goal 24 integration thread for future source-controlled coordination]'), `${label} missing current FlipFlop executor marker`);
  for (const stale of staleOwnerExecutorHardStops) {
    assert(!source.includes(stale), `${label} still lists stale owner/executor hard stop: ${stale}`);
  }
}
for (const marker of [
  '[RESOLVED/NARROWED: Codex Goal 24 integration thread is the runtime validation owner and FlipFlop channel cleanup executor for future source-controlled smoke coordination; runtime side effects remain blocked until bank/refund authority, exact provider proof, Orders/Warehouse packets, and redacted evidence path exist]',
  '[RESOLVED/NARROWED: FlipFlop channel cleanup executor is the Codex Goal 24 integration thread for future source-controlled coordination]',
  '[MISSING: approved token source path, such as an on-host token file path or in-memory handoff, with explicit no-print/no-decode/no-persist handling]',
  '[MISSING: named human Payments/provider rollback execution owner with bank/refund authority for runtime]',
  '[MISSING: exact Orders cleanup packet and sideEffectsHandled acknowledgements]',
  '[MISSING: renewed owner-approved execution window and Warehouse hold/release duration]',
  '[MISSING: final redacted evidence path for required provider, Orders, Warehouse, and channel cleanup proof]',
]) {
  assert(catalogOwnerExecutorWordingSync.includes(marker), `Catalog owner/executor wording sync report missing ${marker}`);
}
for (const boundary of [
  'mutation: false',
  'live_checkout_executed: false',
  'discount_code_created: false',
  'payment_creation: false',
  'provider_call: false',
  'orders_mutation: false',
  'warehouse_mutation: false',
  'channel_cleanup_mutation: false',
  'deployment: false',
  'secret_output: false',
  'token_output: false',
  'raw_customer_or_payment_evidence: false',
]) {
  assert(catalogOwnerExecutorWordingSync.includes(boundary), `Catalog owner/executor wording sync report missing boundary ${boundary}`);
}

console.log('Goal 24 refund/cancel rollback execution approval gate verified');
