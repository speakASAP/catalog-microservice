#!/usr/bin/env node
const fs = require('fs');
const assert = require('assert');

const read = (file) => fs.readFileSync(file, 'utf8');
const packet = read('docs/orchestrator/2026-07-03-goal24-paid-provider-smoke-approval-packet.md');
const channelImplementationContract = read('docs/contracts/catalog-bundle-paid-provider-channel-implementation-contract.md');
const channelContractApproval = read('reports/validation/VAL-GOAL-24-paid-provider-channel-contract-approval.md');
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
const catalogWarehouseBlockerWordingSync = read('reports/validation/VAL-GOAL-24-catalog-warehouse-blocker-wording-sync-2026-07-04.md');
const flipflopAutonomousRuntimeOwnership = read('../flipflop/reports/validation/VAL-GOAL-24-autonomous-runtime-ownership-packet-2026-07-04.md');
const flipflopPaymentResultUrlReadback = read('../flipflop/reports/validation/VAL-GOAL-24-payment-result-url-runtime-readback.md');
const warehouseCleanupPacket = read('../warehouse-microservice/docs/contracts/goal24-warehouse-cleanup-approval-packet.md');
const paymentsTokenBindingConsumption = read('../payments-microservice/reports/validation/VAL-GOAL-24-payments-token-binding-proof-contract-consumption-2026-07-04.md');
const ordersTokenBindingConsumption = read('../orders-microservice/reports/validation/VAL-GOAL-24-orders-token-binding-proof-contract-consumption-2026-07-04.md');
const currentBlockerReconciliation = read('reports/validation/VAL-GOAL-24-current-blocker-reconciliation-2026-07-04.md');

const goal24CurrentHeadVerifierSync = read('reports/validation/VAL-GOAL-24-current-head-verifier-sync-2026-07-04.md');
const goal24CurrentHeadMarker = '[RESOLVED/NARROWED: Goal 24 current-head verifier sync GOAL24-CURRENT-HEADS-2026-07-04F requires Auth 2faf719 docs: complete goal10 customer data wallet rollout, Payments 6bd7b04 docs: sync goal24 payments source wave e, Catalog 12f3386 docs: sync goal24 catalog source wave e, FlipFlop e4ec887 docs: sync goal24 flipflop source wave e, Orders df17b25 docs: sync goal24 orders source wave e, and Warehouse ea7b9e9 merge goal24 warehouse cleanup packet readback sync as the current post-merge validation heads; historical Wave A-E markers are evidence only; runtime side effects remain blocked]';
for (const [label, source] of [
  ['current-head verifier sync report', goal24CurrentHeadVerifierSync],
  ['orchestrator status', status],
  ['implementation state', state],
]) {
  if (!source.includes(goal24CurrentHeadMarker)) {
    throw new Error(label + ' missing Goal 24 current-head verifier sync marker');
  }
}

const flipflopChannelSupersessionMarker = '[RESOLVED/NARROWED: Codex Goal 24 integration thread supersedes earlier FlipFlop channel executor/runtime owner blockers; channel cleanup runtime remains blocked until bank/refund authority, exact provider proof, Orders side-effect acknowledgements, Warehouse target facts, Auth token source, and final redacted evidence path exist]';
const sourceWaveFreezeMarker = '[RESOLVED/NARROWED: Goal 24 frozen source-governance wave GOAL24-SOURCE-WAVE-2026-07-04A records Catalog `e379b54 merge goal24 current source head sync`, FlipFlop `e1f3e3a merge goal24 current source head sync`, Payments `eab6351 merge goal24 current source head sync`, Orders `d53de9f merge goal24 current source head sync`, and Warehouse `11df002 merge goal24 warehouse target facts reconcile` as input heads for runtime planning; post-merge self heads are validation evidence only; runtime side effects remain blocked]';
const sourceWaveBMarker = '[RESOLVED/NARROWED: Goal 24 source-governance wave GOAL24-SOURCE-WAVE-2026-07-04B input set records Auth `2faf719 docs: complete goal10 customer data wallet rollout`, Catalog `dde0f43 merge goal24 owner executor wording sync`, FlipFlop `e8abb44 merge goal24 implementation target facts wording sync`, Payments `9069fd3 merge goal24 payments source wave b`, Orders `908b6ee merge goal24 orders source wave b`, and Warehouse `3fdeabd merge goal24 live target readback wording sync` as Wave B input heads for renewed runtime planning; post-merge source-sync commits are validation evidence only; runtime side effects remain blocked]';
const sourceWaveCMarker = '[RESOLVED/NARROWED: Goal 24 source-governance wave GOAL24-SOURCE-WAVE-2026-07-04C input set records Auth `2faf719 docs: complete goal10 customer data wallet rollout`, Catalog `6723b58 merge goal24 catalog cross-service rollup sync`, FlipFlop `2310c90 merge goal24 flipflop stale blocker wording sync`, Payments `080f293 merge goal24 payments source wave c`, Orders `d32abd2 merge goal24 orders source wave c`, and Warehouse `ea7b9e9 merge goal24 warehouse cleanup packet readback sync` as Wave C input heads for renewed runtime planning; post-merge source-sync commits are validation evidence only; runtime side effects remain blocked]';
const sourceWaveEMarker = '[RESOLVED/NARROWED: Goal 24 source-governance wave GOAL24-SOURCE-WAVE-2026-07-04E input set records Auth `2faf719 docs: complete goal10 customer data wallet rollout`, Catalog `6cdd4f5 docs: clarify goal24 catalog current surface`, FlipFlop `7f2fcb9 docs: sync goal24 url readback owner wording`, Payments `da1e9a6 docs: sync goal24 payments readiness owner wording`, Orders `4dca5e6 docs: sync goal24 orders source wave d`, and Warehouse `ea7b9e9 merge goal24 warehouse cleanup packet readback sync` as Wave E input heads for renewed runtime planning; post-merge source-sync commits are validation evidence only; runtime provider/payment/Orders/Warehouse/channel side effects remain blocked]';
const currentSurfaceNoteMarker = '[RESOLVED/NARROWED: Catalog top-level Wave C entries are frozen source-governance planning inputs, while later validation-owner wording sync commits are validation evidence only and must not be treated as renewed runtime authority]';

const requiredMarkers = [
  '## Refund/Cancel Rollback Execution Approval Decision',
  'This packet does not authorize any refund, cancel, void, reversal, live checkout, provider redirect, webhook replay, Orders mutation, Warehouse mutation, or channel cleanup beyond the retained owner-confirmed 1 CZK Fiobanka evidence payment.',
  '[MISSING: owner-approved refund/cancel rollback execution approval for future paid/provider smoke beyond the retained 1 CZK Fiobanka evidence payment]',
  '[RESOLVED/NARROWED: redacted runtime evidence packet captured a real bank-originated CZK transaction-polling match for the retained Goal 24 variable symbol hash d7512419521d2cab without token or raw payload output]',
  '[RESOLVED/NARROWED: deployed ready Payments pod has FIO_BANKA_WEBHOOK_SECRET present and healthy without secret output]',
  '[MISSING: named Payments/provider rollback execution owner]',
  '[MISSING: named runtime Orders cancellation actor/approvedBy, exact target order hash/state, sideEffectsHandled acknowledgements, sanitized idempotency key, provider proof hash or unpaid acknowledgement, and approved runtime route invocation evidence]',
  '[MISSING: side-effectful rollback run id and cleanup idempotency keys]',
  '[RESOLVED/NARROWED: owner-confirmed manual Fiobanka refund was executed through the external refund service; automated Payments Fiobanka refund remains fail-closed]',
  '[MISSING: sanitized exact-order linkage between the manual refund confirmation and the Goal 24 completed Fiobanka smoke order]',
  '[MISSING: FlipFlop runtime readback showing the exact smoke order acknowledged as status=refunded and paymentStatus=refunded after manual refund]',
  '[RESOLVED/NARROWED: sanitized runtime readback found completed Fiobanka provider-payment evidence but no central Orders or FlipFlop exact-order linkage for the retained Goal 24 payment]',
  '[RESOLVED: owner accepted owner-confirmed manual Fiobanka refund as sufficient Goal 24 closeout without exact order linkage]',
  '[MISSING: renewed owner-approved execution window for Europe/Prague after 2026-07-03T23:59:59+02:00]',
  '[RESOLVED/NARROWED: FIO_BANKA_PAYMENT_ORDER_TOKEN_CZK and FIO_BANKA_PAYMENT_ORDER_TOKEN_EUR are present in the current ready Payments pod without value output; payment-order upload remains gated by FIO_BANKA_REFUND_UPLOAD_ENABLED=true, named bank/refund executor, exact future payment/order/provider hashes, concrete idempotency keys, and bank completion evidence]',
  '[RESOLVED/NARROWED: owner delegated autonomous Goal 24 continuation to Codex, but integration validation keeps new Fiobanka paid/provider side effects hard-stopped until bank/refund authority, exact Orders/Warehouse packet, and redacted provider proof exist]',
  '[RESOLVED/NARROWED: Codex Goal 24 integration thread is the runtime validation owner and FlipFlop channel cleanup executor for future source-controlled smoke coordination; runtime side effects remain blocked until bank/refund authority, exact provider proof, Orders/Warehouse packets, and redacted evidence path exist]',
  '[RESOLVED/NARROWED: sanitized Auth readback found one active verified Goal 24 actor hash 4215870ba488de17 with app:flipflop-service:admin and no token/raw email/user id output]',
  '[MISSING: approved token source path, such as an on-host token file path or in-memory handoff, with explicit no-print/no-decode/no-persist handling]',
  '[MISSING: confirmation that the token belongs to actor hash 4215870ba488de17 and carries app:flipflop-service:admin or global:superadmin]',
  '[RESOLVED/NARROWED: Codex Goal 24 integration thread is the runtime validation owner for future source-controlled smoke coordination; runtime side effects remain blocked until bank/refund authority, exact provider proof, Orders/Warehouse packets, FIO_BANKA_REFUND_UPLOAD_ENABLED=true, named bank/refund executor, exact future payment/order/provider hashes, idempotency keys, and redacted evidence path exist]',
  'Fiobanka completed-transfer rollback is not an automated provider-side Payments refund endpoint',
  'guarded payment-order upload that remains `PENDING_AUTHORIZATION` until Internetbanking/bank completion evidence exists',
  '[RESOLVED/NARROWED: runtime readback found no linked central Orders or FlipFlop state, so no Orders/Warehouse post-paid correction is required for this evidence-only closeout]',
  'For Fiobanka QR, the only currently source-supported side-effect-safe rollback is stop-before-paid',
  'A refund alone is not Warehouse return evidence.',
  'Stop before provider refund/cancel/reversal if the provider operation, provider owner, evidence redaction path, and amount ceiling are not explicitly recorded.',
  'Owner approval boundary: the current owner approval covers self-discovery, packet fill, and read-only/preflight verification only.',
  'Catalog consumed FlipFlop `5202c15 merge goal24 channel cleanup owner supersession`',
  flipflopChannelSupersessionMarker,
];


const currentBlockerReconciliationMarker = '[RESOLVED/NARROWED: Catalog current blocker reconciliation distinguishes historical live-run executor/runtime validation owner wording from current runtime blockers; Codex owns source-controlled validation/stop authority only, while live execution remains blocked by Auth token source, Payments bank/refund authority, exact provider proof, Orders sideEffectsHandled, Warehouse live row/window/final approval, channel acknowledgement, and final redacted evidence path]';
for (const [label, source] of [
  ['approval packet', packet],
  ['channel implementation contract', channelImplementationContract],
  ['current blocker reconciliation report', currentBlockerReconciliation],
  ['implementation state', state],
  ['orchestrator status', status],
]) {
  assert(source.includes(currentBlockerReconciliationMarker), `${label} missing current blocker reconciliation marker`);
  assert(source.includes('[MISSING: named human Payments/provider rollback execution owner with bank/refund authority for runtime]'), `${label} missing Payments bank/refund authority blocker`);
  assert(source.includes('[MISSING: exact Orders cleanup packet and sideEffectsHandled acknowledgements]'), `${label} missing Orders sideEffectsHandled blocker`);
  assert(source.includes('[MISSING: final redacted evidence path for required provider, Orders, Warehouse, and channel cleanup proof]'), `${label} missing final evidence blocker`);
}
assert(packet.includes('[MISSING: named live-run executor for the exact side-effectful smoke]'), 'approval packet must keep live-run executor blocker separate from runtime validation owner');
for (const [label, source] of [
  ['implementation state', state],
  ['orchestrator status', status],
  ['current head sync report', currentHeadSyncReport],
]) {
  assert(source.includes(currentSurfaceNoteMarker), `${label} missing Catalog current surface note marker`);
}
assert(!packet.includes('[MISSING: named live-run executor/runtime validation owner for the exact side-effectful smoke]'), 'approval packet must not keep combined live-run executor/runtime validation owner blocker');
for (const stale of [
  'runtime validation owner `[MISSING]`',
  'runtime validation owner `[MISSING: assigned owner]`',
  '[MISSING: runtime validation owner for live paid/provider bundle smoke]',
]) {
  assert(!packet.includes(stale), `approval packet must not keep stale runtime validation owner wording: ${stale}`);
}
assert(channelImplementationContract.includes('[RESOLVED: active FlipFlop checkout paths pass central Orders UUIDs to Payments before provider creation]'), 'channel implementation contract missing central Orders UUID resolved marker');
assert(channelImplementationContract.includes('[RESOLVED: runtime verification of Payments Orders service token/role for the current bridge mechanism]'), 'channel implementation contract missing Payments Orders token resolved marker');

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
  assert(source.includes('[RESOLVED/NARROWED: active Payments runtime image localhost:5000/payments-microservice:d403706 exposes FIO_BANKA_PAYMENT_ORDER_TOKEN_CZK/EUR as present length-valid env vars without value output while FIO_BANKA_REFUND_UPLOAD_ENABLED=false]'), `${label} missing active Payments token provisioning marker`);
  assert(source.includes('[RESOLVED/NARROWED: FIO_BANKA_PAYMENT_ORDER_TOKEN_CZK and FIO_BANKA_PAYMENT_ORDER_TOKEN_EUR are present in the current ready Payments pod without value output; payment-order upload remains gated by FIO_BANKA_REFUND_UPLOAD_ENABLED=true, named bank/refund executor, exact future payment/order/provider hashes, concrete idempotency keys, and bank completion evidence]'), `${label} missing Fiobanka payment-order token-present gated marker`);
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
  assert(source.includes(sourceWaveCMarker), `${label} missing source-wave C marker`);
for (const [label, source] of [
  ['source-wave freeze report', currentHeadSyncReport],
  ['approval packet', packet],
  ['implementation state', state],
  ['orchestrator status', status],
]) {
  assert(source.includes(sourceWaveEMarker), `${label} missing source-wave E marker`);
  for (const marker of [
    'Auth `2faf719 docs: complete goal10 customer data wallet rollout`',
    'Catalog `6cdd4f5 docs: clarify goal24 catalog current surface`',
    'FlipFlop `7f2fcb9 docs: sync goal24 url readback owner wording`',
    'Payments `da1e9a6 docs: sync goal24 payments readiness owner wording`',
    'Orders `4dca5e6 docs: sync goal24 orders source wave d`',
    'Warehouse `ea7b9e9 merge goal24 warehouse cleanup packet readback sync`',
    '[MISSING: live current target row readback at execution time]',
    '[MISSING: final redacted evidence path for required provider, Orders, Warehouse, and channel cleanup proof]',
  ]) {
    assert(source.includes(marker), `${label} missing source-wave E marker ${marker}`);
  }
}
  for (const marker of [
    'Auth `2faf719 docs: complete goal10 customer data wallet rollout`',
    'Catalog `6723b58 merge goal24 catalog cross-service rollup sync`',
    'FlipFlop `2310c90 merge goal24 flipflop stale blocker wording sync`',
    'Payments `080f293 merge goal24 payments source wave c`',
    'Orders `d32abd2 merge goal24 orders source wave c`',
    'Warehouse `ea7b9e9 merge goal24 warehouse cleanup packet readback sync`',
    '[MISSING: live current target row readback at execution time]',
    '[MISSING: final redacted evidence path for required provider, Orders, Warehouse, and channel cleanup proof]',
  ]) {
    assert(source.includes(marker), `${label} missing source-wave C marker ${marker}`);
  }
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
for (const [label, source] of [
  ['source-wave freeze report', currentHeadSyncReport],
  ['approval packet', packet],
  ['implementation state', state],
  ['orchestrator status', status],
]) {
  assert(source.includes(sourceWaveBMarker), `${label} missing source-wave B marker`);
  for (const marker of [
    'Auth `2faf719 docs: complete goal10 customer data wallet rollout`',
    'Catalog `dde0f43 merge goal24 owner executor wording sync`',
    'FlipFlop `e8abb44 merge goal24 implementation target facts wording sync`',
    'Payments `9069fd3 merge goal24 payments source wave b`',
    'Orders `908b6ee merge goal24 orders source wave b`',
    'Warehouse `3fdeabd merge goal24 live target readback wording sync`',
    '[MISSING: live current target row readback at execution time]',
    '[MISSING: final redacted evidence path for required provider, Orders, Warehouse, and channel cleanup proof]',
  ]) {
    assert(source.includes(marker), `${label} missing source-wave B marker ${marker}`);
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
  '[RESOLVED/NARROWED: FIO_BANKA_PAYMENT_ORDER_TOKEN_CZK and FIO_BANKA_PAYMENT_ORDER_TOKEN_EUR are present in the current ready Payments pod without value output; payment-order upload remains gated by FIO_BANKA_REFUND_UPLOAD_ENABLED=true, named bank/refund executor, exact future payment/order/provider hashes, concrete idempotency keys, and bank completion evidence]',
  '[RESOLVED/NARROWED: owner delegated autonomous Goal 24 continuation to Codex, but integration validation keeps new Fiobanka paid/provider side effects hard-stopped until bank/refund authority, exact Orders/Warehouse packet, and redacted provider proof exist]',
  '[RESOLVED/NARROWED: Codex Goal 24 integration thread is the runtime validation owner and FlipFlop channel cleanup executor for future source-controlled smoke coordination; runtime side effects remain blocked until bank/refund authority, exact provider proof, Orders/Warehouse packets, and redacted evidence path exist]',
  '[RESOLVED/NARROWED: sanitized Auth readback found one active verified Goal 24 actor hash 4215870ba488de17 with app:flipflop-service:admin and no token/raw email/user id output]',
  '[MISSING: approved token source path, such as an on-host token file path or in-memory handoff, with explicit no-print/no-decode/no-persist handling]',
  '[MISSING: confirmation that the token belongs to actor hash 4215870ba488de17 and carries app:flipflop-service:admin or global:superadmin]',
  '[RESOLVED/NARROWED: Codex Goal 24 integration thread is the runtime validation owner for future source-controlled smoke coordination; runtime side effects remain blocked until bank/refund authority, exact provider proof, Orders/Warehouse packets, FIO_BANKA_REFUND_UPLOAD_ENABLED=true, named bank/refund executor, exact future payment/order/provider hashes, idempotency keys, and redacted evidence path exist]',
  'Fiobanka completed-transfer rollback is not an automated provider-side Payments refund endpoint',
  'guarded payment-order upload that remains `PENDING_AUTHORIZATION` until Internetbanking/bank completion evidence exists',
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
for (const [label, source] of [
  ['validation report', report],
  ['approval packet', packet],
  ['implementation state', state],
  ['orchestrator status', status],
  ['paid/provider channel implementation contract', channelImplementationContract],
  ['paid/provider channel contract approval report', channelContractApproval],
  ['orders/payments head sync report', ordersPaymentsHeadSyncReport],
  ['FlipFlop channel supersession consumption report', flipflopChannelSupersessionReport],
]) {
  assert(!source.includes('[MISSING: owner-approved Warehouse stock hold/release window and max quantity]'), `${label} still contains stale Warehouse hold/max blocker`);
  assert(!source.includes('[MISSING: owner-approved Warehouse stock hold/release window, max quantity, target rows]'), `${label} still contains stale Warehouse hold/max/target rows blocker`);
  assert(!source.includes('[MISSING: owner-approved Orders cancellation/refund correction actor, reason, sideEffectsHandled acknowledgement, and route]'), `${label} still contains stale Orders route-missing blocker`);
  assert(!source.includes('[MISSING: Orders/Payments provider-success, provider-cancel, refund, and post-fulfillment cancellation event contract that maps to Warehouse fulfill/cancel/return calls]'), `${label} still contains stale broad Orders/Payments event-contract blocker`);
  assert(source.includes('[RESOLVED/NARROWED: candidate target component stock rows and max component quantity are source-documented from Catalog packet]'), `${label} missing source-documented Warehouse candidate facts marker`);
  assert(source.includes('[MISSING: live current target row readback at execution time]'), `${label} missing live current Warehouse readback blocker`);
  assert(source.includes('[MISSING: renewed owner-approved execution window and Warehouse hold/release duration]'), `${label} missing renewed Warehouse window blocker`);
  assert(source.includes('[MISSING: final owner approval before any live Warehouse reservation/cleanup mutation]'), `${label} missing final Warehouse mutation approval blocker`);
}
for (const [label, source] of [
  ['validation report', report],
  ['approval packet', packet],
  ['implementation state', state],
  ['orchestrator status', status],
  ['paid/provider channel implementation contract', channelImplementationContract],
  ['paid/provider channel contract approval report', channelContractApproval],
]) {
  assert(source.includes('[RESOLVED/NARROWED: Orders/Payments completed|failed|cancelled source mapping plus Orders cancellation cleanup gate are source-defined; runtime remains blocked on exact provider proof, target order hash/state, named actor, side-effect acknowledgements, live Warehouse readback, and final mutation approval]'), `${label} missing narrowed Orders/Payments source mapping marker`);
}

for (const value of [
  'mutation: false',
  'live_checkout_executed: false',
  'provider_call: false',
  'orders_mutation: false',
  'warehouse_mutation: false',
  'warehouse_direct_mutation: false',
  'db_write: false',
  'secret_output: false',
  'raw_customer_or_payment_evidence: false',
  '[MISSING: live current target row readback at execution time]',
  '[MISSING: renewed owner-approved execution window and Warehouse hold/release duration]',
  '[MISSING: final owner approval before any live Warehouse reservation/cleanup mutation]',
]) {
  assert(catalogWarehouseBlockerWordingSync.includes(value), `Catalog Warehouse blocker wording sync report missing ${value}`);
}
for (const marker of [
  '[MISSING: approved token source path, such as an on-host token file path or in-memory handoff, with explicit no-print/no-decode/no-persist handling]',
  '[MISSING: confirmation that the token belongs to actor hash 4215870ba488de17 and carries app:flipflop-service:admin or global:superadmin]',
  '[MISSING: named human Payments/provider rollback execution owner with bank/refund authority for runtime]',
  '[MISSING: future paymentId/orderId/variableSymbolHash/providerTransactionHash for exact smoke]',
  '[MISSING: concrete side-effectful rollback run id and cleanup idempotency keys]',
  '[MISSING: exact Orders cleanup packet and sideEffectsHandled acknowledgements]',
  '[RESOLVED/NARROWED: candidate target component stock rows and max component quantity are source-documented from Catalog packet]',
  '[MISSING: live current target row readback at execution time]',
  '[MISSING: renewed owner-approved execution window and Warehouse hold/release duration]',
  '[MISSING: final owner approval before any live Warehouse reservation/cleanup mutation]',
  '[RESOLVED/NARROWED: FIO_BANKA_PAYMENT_ORDER_TOKEN_CZK and FIO_BANKA_PAYMENT_ORDER_TOKEN_EUR are present in the current ready Payments pod without value output; payment-order upload remains gated by FIO_BANKA_REFUND_UPLOAD_ENABLED=true, named bank/refund executor, exact future payment/order/provider hashes, concrete idempotency keys, and bank completion evidence]',
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
const currentStatusSurface = status.split('\n').slice(0, 40).join('\n');
for (const stale of staleOwnerExecutorHardStops) {
  assert(!currentStatusSurface.includes(stale.replace('- `', '').replace('`.', '')), 'current Catalog status still lists stale owner/executor hard stop: ' + stale);
}
assert(currentStatusSurface.includes('[RESOLVED/NARROWED: Codex Goal 24 integration thread is the runtime validation owner and FlipFlop channel cleanup executor for future source-controlled smoke coordination; runtime side effects remain blocked until bank/refund authority, exact provider proof, Orders/Warehouse packets, and redacted evidence path exist]'), 'current Catalog status missing owner/executor narrowing marker');

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

assert(packet.includes('historical read-only available=118/108'), 'approval packet must label Warehouse available readback historical only');
assert(packet.includes('historical read-only reserved=0/0'), 'approval packet must label Warehouse reserved readback historical only');
assert(packet.includes('[MISSING: live current target row readback at execution time]'), 'approval packet must preserve live Warehouse readback blocker');
