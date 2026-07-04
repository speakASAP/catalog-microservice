#!/usr/bin/env node
const fs = require('fs');
const assert = require('assert');

const read = (file) => fs.readFileSync(file, 'utf8');
const selectedWarehouseLookupBlocker = '[MISSING: exact selected Warehouse reservation lookup state for cleanup]';
const legacyWarehouseWindowBlocker = '[MISSING: Warehouse hold/release duration]';
const selectedWarehouseWindowMarker = `[RESOLVED/NARROWED: approval intake 003 supplies the bounded smoke execution window]; ${selectedWarehouseLookupBlocker}`;
const legacyWarehouseWindowMarker = `[RESOLVED/NARROWED: approval intake 003 supplies the bounded smoke execution window]; ${legacyWarehouseWindowBlocker}`;
const fullSelectedWarehouseWindowMarker = `[RESOLVED/NARROWED: approval intake 003 supplies the bounded smoke execution window]; [RESOLVED/NARROWED: Warehouse final bounded one-attempt approval is source-defined for packet planning only]; ${selectedWarehouseLookupBlocker}`;
const resolvedWarehouseDurationMarker = `[RESOLVED/NARROWED: Warehouse hold/release duration is owner-approved for the bounded Goal 24 smoke as 15 minutes source-default TTL or shorter caller-supplied expiresAt]; ${selectedWarehouseLookupBlocker}`;
const hasWarehouseWindowMarker = (source) => source.includes(selectedWarehouseWindowMarker) || source.includes(legacyWarehouseWindowMarker) || source.includes(fullSelectedWarehouseWindowMarker) || source.includes(resolvedWarehouseDurationMarker);
const hasWarehouseFinalApprovalMarker = (source) => source.includes('[MISSING: final owner approval before any live Warehouse reservation/cleanup mutation]') || source.includes('[RESOLVED/NARROWED: Warehouse final bounded one-attempt approval is source-defined for packet planning only]') || source.includes('[RESOLVED/NARROWED: final owner approval before live Warehouse reservation mutation is bounded to one Goal 24 component-line smoke attempt with max quantity 1 per component after live readback]');
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
const authTokenProofCleanup = read('reports/validation/VAL-GOAL-24-auth-token-proof-cleanup-2026-07-04.md');
const currentRuntimeReadinessSync = read('reports/validation/VAL-GOAL-24-current-runtime-readiness-sync-2026-07-04.md');
const warehouse89222f8ReadbackConsumption = read('reports/validation/VAL-GOAL-24-warehouse-89222f8-readback-consumption-2026-07-04.md');
const catalogCleanupRuntimeValuesConsumption = read('reports/validation/VAL-GOAL-24-catalog-consume-cleanup-runtime-values-59be11e-8bb22e2-d39bc0c-cf340f5-2026-07-04.md');
const paymentsCleanupRuntimeValuesConsumption = read('../payments-microservice/reports/validation/VAL-GOAL-24-payments-consume-cleanup-packet-runtime-values-d39bc0c-cf340f5-2026-07-04.md');
const ordersCleanupRuntimeValuesConsumption = read('../orders-microservice/reports/validation/VAL-GOAL-24-orders-consume-cleanup-packet-runtime-values-59be11e-d39bc0c-2026-07-04.md');
const flipflopCleanupRuntimeValuesSync = read('../flipflop/reports/validation/VAL-GOAL-24-cleanup-packet-runtime-values-sync-2026-07-04.md');
const catalogLiveNoGoPreflightConsumption = read('reports/validation/VAL-GOAL-24-catalog-consume-live-no-go-preflight-cc49c08-686d49c-2026-07-04.md');
const paymentsLiveNoGoPreflight = read('../payments-microservice/reports/validation/VAL-GOAL-24-live-paid-provider-no-go-preflight-2026-07-04.md');
const warehouseCurrentStatus = read('../warehouse-microservice/docs/orchestrator/STATUS.md');
const catalogOrdersWarehouseNoGoConsumption = read('reports/validation/VAL-GOAL-24-catalog-consume-orders-warehouse-no-go-9287e3f-eee2f20-2026-07-04.md');
const ordersNoGoCurrentHeadsConsumption = read('../orders-microservice/reports/validation/VAL-GOAL-24-orders-consume-goal24-source-only-current-heads-2026-07-04.md');
const ordersFinalOwnerHandoffReport = read('../orders-microservice/reports/validation/VAL-GOAL-24-orders-final-owner-handoff-packet-2026-07-04.md');
const catalogOrdersFinalHandoffConsumption = read('reports/validation/VAL-GOAL-24-catalog-consume-orders-final-owner-handoff-d98fb19-2026-07-04.md');
const warehouseOrdersNoGoConsumption = read('../warehouse-microservice/reports/validation/VAL-GOAL-24-warehouse-consume-live-no-go-preflight-9287e3f-cc49c08-d1eef3d-9a7c664-2026-07-04.md');
const flipflopDurableMigrationReadiness = read('../flipflop/implementation-goals/GOAL-24-durable-bundleid-checkout-migration-readiness.md');
const catalogCurrentPaymentsOrdersHeads = read('reports/validation/VAL-GOAL-24-catalog-consume-current-payments-orders-heads-2026-07-04.md');
const paymentsPreSideEffectPacket = read('../payments-microservice/docs/orchestrator/2026-07-04-goal24-pre-side-effect-runtime-execution-packet.md');
const ordersPaymentsPreSideEffectConsumption = read('../orders-microservice/reports/validation/VAL-GOAL-24-orders-consume-payments-pre-side-effect-packet-445c4e7-2026-07-04.md');


const catalogLiveNoGoPreflightMarker = '[RESOLVED/NARROWED: Catalog consumed Payments cc49c08 live no-go preflight and Warehouse 686d49c blocker wording sync; runtime deployments are ready but paid/provider side effects remain hard-stopped until bank/refund authority, exact future smoke identities, Orders sideEffectsHandled acknowledgements, deterministic Warehouse reservation lookup state, channel acknowledgement, and final redacted evidence exist]';
for (const [label, source] of [
  ['Catalog live no-go preflight consumption report', catalogLiveNoGoPreflightConsumption],
  ['validation report', report],
  ['implementation state', state],
  ['orchestrator status', status],
]) {
  assert(source.includes(catalogLiveNoGoPreflightMarker), `${label} missing Catalog live no-go preflight marker`);
  assert(source.includes('[RESOLVED/NARROWED: owner statement names Sergey Stasok / Сергей Сташок as the human Payments/provider rollback owner, bank/refund authority, and bank/refund executor for Goal 24 runtime planning; runtime side effects remain blocked until exact future payment/order/provider hashes, provider proof, Orders/Warehouse/channel packets, idempotency keys, and final redacted evidence exist]'), `${label} missing Payments bank/refund authority blocker`);
  assert(source.includes('[MISSING: future paymentId/orderId/variableSymbolHash/providerTransactionHash for exact smoke]'), `${label} missing future smoke identity blocker`);
  assert(source.includes('[MISSING: exact selected Warehouse reservation lookup state for cleanup]'), `${label} missing selected Warehouse reservation lookup blocker`);
  assert(source.includes('[MISSING: final redacted evidence path for required provider, Orders, Warehouse, and channel cleanup proof]'), `${label} missing final evidence blocker`);
  for (const boundary of ['mutation: false', 'provider_call: false', 'orders_mutation: false', 'warehouse_mutation: false', 'secret_output: false']) {
    assert(source.includes(boundary), `${label} missing boundary ${boundary}`);
  }
}
for (const marker of [
  'status: runtime-ready-but-side-effect-hard-stopped',
  'Decision: `block` before checkout/payment/provider side effects.',
  '[RESOLVED/NARROWED: selected Fiobanka provider authenticity path is authenticated transaction polling]',
  '[RESOLVED/NARROWED: owner statement names Sergey Stasok / Сергей Сташок as the human Payments/provider rollback owner, bank/refund authority, and bank/refund executor for Goal 24 runtime planning; runtime side effects remain blocked until exact future payment/order/provider hashes, provider proof, Orders/Warehouse/channel packets, idempotency keys, and final redacted evidence exist]',
  '[MISSING: exact destination/source account proof, amount, reference, deadline, and redacted completion evidence for the future linked payment]',
  '[MISSING: exact Orders target order hash/state, cancellation actor, approval id, safe reason code, idempotency key, and sideEffectsHandled payment|warehouse|notification|crm|channel acknowledgements for the future smoke]',
  '[MISSING: deterministic Warehouse component reservation state for cleanup]',
  '[MISSING: final redacted evidence path for required provider, Orders, Warehouse, and channel cleanup proof]',
  'checkout_created: false',
  'provider_call: false',
  'warehouse_mutation: false',
]) {
  assert(paymentsLiveNoGoPreflight.includes(marker), `Payments live no-go preflight missing ${marker}`);
}
for (const marker of [
  '2026-07-04: Goal 24 Warehouse consumed Catalog `fa88917`, Payments `59be11e`, Orders `8bb22e2`, and FlipFlop `9a7c664` source-only cleanup runtime-values sync.',
  '[RESOLVED/NARROWED: Warehouse consumed Catalog fa88917, Payments 59be11e, Orders 8bb22e2, and FlipFlop 9a7c664 cleanup runtime-values sync; hold duration and one-attempt final bounded reservation approval are source-defined for packet planning only, while exact selected reservation lookup state remains missing]',
  '[MISSING: exact selected Warehouse reservation lookup state for cleanup]',
  'Warehouse must not infer stock effects from Payments refund state, provider state, Auth token state, or channel cleanup state.',
  'warehouse_mutation: false',
]) {
  assert(warehouseCurrentStatus.includes(marker), `Warehouse current status missing ${marker}`);
}




const catalogOrdersFinalHandoffMarker = '[RESOLVED/NARROWED: Catalog consumed Orders d98fb19 final owner handoff packet as source-governance evidence; Orders cleanup route invocation remains hard-stopped until named Payments/bank authority, exact future payment/order/provider hashes, Orders actor/reason/idempotency/sideEffectsHandled, exact Warehouse reservation lookup state, channel acknowledgement, and final redacted evidence exist]';
for (const [label, source] of [
  ['Catalog Orders final handoff consumption report', catalogOrdersFinalHandoffConsumption],
  ['validation report', report],
  ['implementation state', state],
  ['orchestrator status', status],
  ['approval packet', packet],
]) {
  assert(source.includes(catalogOrdersFinalHandoffMarker), `${label} missing Catalog Orders final owner handoff marker`);
  assert(source.includes('[RESOLVED/NARROWED: owner statement names Sergey Stasok / Сергей Сташок as the human Payments/provider rollback owner, bank/refund authority, and bank/refund executor for Goal 24 runtime planning; runtime side effects remain blocked until exact future payment/order/provider hashes, provider proof, Orders/Warehouse/channel packets, idempotency keys, and final redacted evidence exist]'), `${label} missing Payments bank/refund authority blocker after Orders final handoff`);
  assert(source.includes('[MISSING: future paymentId/orderId/variableSymbolHash/providerTransactionHash for exact smoke]'), `${label} missing future smoke identity blocker after Orders final handoff`);
  assert(source.includes('[MISSING: exact Orders target order hash/state, cancellation actor, approval id, safe reason code, idempotency key, and sideEffectsHandled payment|warehouse|notification|crm|channel acknowledgements for the future smoke]'), `${label} missing exact Orders packet blocker after Orders final handoff`);
  assert(source.includes('[MISSING: exact selected Warehouse reservation lookup state for cleanup]'), `${label} missing Warehouse lookup blocker after Orders final handoff`);
  assert(source.includes('[MISSING: final redacted evidence path for required provider, Orders, Warehouse, and channel cleanup proof]'), `${label} missing final evidence blocker after Orders final handoff`);
  assert(source.includes('Catalog consumes Orders `d98fb19 docs: add goal24 orders final owner handoff packet` as source governance only') || source.includes('Goal 24 Catalog consumed Orders `d98fb19 docs: add goal24 orders final owner handoff packet` source-only'), `${label} missing source-only Orders d98fb19 consumption wording`);
  for (const boundary of ['mutation: false', 'orders_route_invocation: false', 'orders_mutation: false', 'warehouse_mutation: false', 'provider_call: false', 'secret_output: false']) {
    assert(source.includes(boundary), `${label} missing boundary ${boundary} after Orders final handoff`);
  }
}
for (const marker of [
  '[RESOLVED/NARROWED: Orders final owner handoff packet is source-defined for Goal 24 paid/provider cleanup after Catalog 7c85732 and FlipFlop 99dfe76 plus Payments 4f21094 owner authority; runtime route invocation remains hard-stopped until exact future payment/order/provider hashes, Orders actor/reason/idempotency/sideEffectsHandled, exact Warehouse reservation lookup state, channel acknowledgement, provider proof, and final redacted evidence exist]',
  'Route shape: `PUT /api/orders/:id/status` with `status=cancelled`.',
  'Safe reasons: `GOAL24_PAID_PROVIDER_ROLLBACK` and `GOAL24_PROVIDER_UNPAID_CANCEL`.',
  'Orders idempotency namespace: `orders:goal24:post-paid-correction:<approvalId>:<paymentHash>`.',
  'Side-effect gate: `sideEffectsHandled.payment|warehouse|notification|crm|channel=true`.',
  '[MISSING: exact selected Orders cleanup packet runtime values and sideEffectsHandled acknowledgements]',
]) {
  assert(ordersFinalOwnerHandoffReport.includes(marker), `Orders final owner handoff report missing ${marker}`);
}

const catalogOrdersWarehouseNoGoMarker = '[RESOLVED/NARROWED: Catalog consumed Orders 9287e3f live no-go consumer sync and Warehouse eee2f20 Orders no-go consumer sync as source-governance inputs only; Catalog approval planning remains hard-stopped until bank/refund authority, exact future smoke identities, Orders sideEffectsHandled acknowledgements, exact Warehouse reservation lookup state, channel acknowledgement, and final redacted evidence exist]';
for (const [label, source] of [
  ['Catalog Orders/Warehouse no-go consumption report', catalogOrdersWarehouseNoGoConsumption],
  ['validation report', report],
  ['implementation state', state],
  ['orchestrator status', status],
  ['approval packet', packet],
]) {
  assert(source.includes(catalogOrdersWarehouseNoGoMarker), `${label} missing Catalog Orders/Warehouse no-go marker`);
  assert(source.includes('[MISSING: exact Orders target order hash/state, cancellation actor, approval id, safe reason code, idempotency key, and sideEffectsHandled payment|warehouse|notification|crm|channel acknowledgements for the future smoke]'), `${label} missing exact Orders runtime packet blocker`);
  assert(source.includes('[MISSING: exact selected Warehouse reservation lookup state for cleanup]'), `${label} missing selected Warehouse reservation lookup blocker`);
  assert(source.includes('[MISSING: final redacted evidence path for required provider, Orders, Warehouse, and channel cleanup proof]'), `${label} missing final evidence blocker`);
  assert(source.includes('Catalog must not infer Warehouse stock effects from Payments refund state or Orders no-go state'), `${label} missing no stock inference boundary`);
  for (const boundary of ['mutation: false', 'orders_route_invocation: false', 'warehouse_mutation: false', 'provider_call: false', 'secret_output: false']) {
    assert(source.includes(boundary), `${label} missing boundary ${boundary}`);
  }
}
for (const marker of [
  '[RESOLVED/NARROWED: Orders consumed Payments cc49c08 live no-go preflight, Catalog d1eef3d live no-go preflight consumption, Warehouse 686d49c blocker wording, and FlipFlop 9a7c664 durable migration provider marker as source-governance inputs only; runtime Orders route invocation and cleanup side effects remain blocked]',
  '[MISSING: exact Orders target order hash/state, cancellation actor, approval id, safe reason code, idempotency key, and sideEffectsHandled payment|warehouse|notification|crm|channel acknowledgements for the future smoke]',
  'Orders must not infer Warehouse stock effects from Payments refund state',
]) {
  assert(ordersNoGoCurrentHeadsConsumption.includes(marker), `Orders no-go consumption missing ${marker}`);
}
for (const marker of [
  '[RESOLVED/NARROWED: Warehouse consumed Orders 9287e3f live no-go consumer sync, Payments cc49c08 live no-go preflight, Catalog d1eef3d no-go consumer sync, and FlipFlop 9a7c664 durable migration provider marker as source-governance inputs only; Warehouse stock/reservation effects remain hard-stopped until exact selected reservation lookup state, selected order/payment/provider hashes, Orders sideEffectsHandled acknowledgements, provider proof or unpaid acknowledgement, channel acknowledgement, and final redacted evidence exist]',
  '[MISSING: exact selected Warehouse reservation lookup state for cleanup]',
  'A Payments refund alone is not Warehouse return evidence.',
]) {
  assert(warehouseOrdersNoGoConsumption.includes(marker), `Warehouse no-go consumption missing ${marker}`);
}
for (const marker of [
  'runtime_progression: source-rollout-enabled-paid-provider-blocked',
  '[RESOLVED/NARROWED: FlipFlop source rollout maps durable catalog.bundle.v1 bundleId into central Orders bundleEvidence without changing totals, stock identity, or provider state]',
]) {
  assert(flipflopDurableMigrationReadiness.includes(marker), `FlipFlop durable migration readiness missing ${marker}`);
}


const catalogCleanupRuntimeValuesMarker = '[RESOLVED/NARROWED: Catalog consumed Payments 59be11e, Orders 8bb22e2, FlipFlop d39bc0c, and Warehouse cf340f5 cleanup runtime-values sync; packet shapes and Warehouse hold/final bounded approval are source-defined, while exact selected runtime values remain missing]';
for (const [label, source] of [
  ['Catalog cleanup runtime-values consumption report', catalogCleanupRuntimeValuesConsumption],
  ['validation report', report],
  ['implementation state', state],
  ['orchestrator status', status],
]) {
  assert(source.includes(catalogCleanupRuntimeValuesMarker), `${label} missing Catalog cleanup runtime-values marker`);
  assert(source.includes('[MISSING: exact selected Orders cleanup packet runtime values and sideEffectsHandled acknowledgements]'), `${label} missing selected Orders runtime-values blocker`);
  assert(source.includes('[MISSING: exact selected Warehouse reservation lookup state for cleanup]'), `${label} missing selected Warehouse reservation lookup blocker`);
  for (const boundary of ['mutation: false', 'provider_call: false', 'orders_mutation: false', 'warehouse_mutation: false', 'secret_output: false']) {
    assert(source.includes(boundary), `${label} missing boundary ${boundary}`);
  }
}
assert(paymentsCleanupRuntimeValuesConsumption.includes('[RESOLVED/NARROWED: Payments consumed FlipFlop d39bc0c cleanup packet runtime-values sync; Orders cleanup packet shape and Warehouse component-line cleanup packet shape are source-defined, while exact selected runtime values remain missing]'), 'Payments cleanup runtime-values marker missing');
assert(ordersCleanupRuntimeValuesConsumption.includes('[RESOLVED/NARROWED: Orders consumed Payments 59be11e and FlipFlop d39bc0c cleanup packet runtime-values sync; Orders cleanup packet shape is source-defined, while exact selected target values and sideEffectsHandled acknowledgements remain missing]'), 'Orders cleanup runtime-values marker missing');
assert(flipflopCleanupRuntimeValuesSync.includes('[RESOLVED/NARROWED: Orders cleanup packet shape and Warehouse component-line cleanup packet shape are source-defined; runtime remains blocked until the selected smoke supplies exact Orders packet values, sideEffectsHandled acknowledgements, provider proof, and deterministic Warehouse reservation lookup state]'), 'FlipFlop cleanup runtime-values marker missing');

for (const [label, source] of [
  ['current runtime readiness sync report', currentRuntimeReadinessSync],
  ['warehouse 89222f8 readback consumption report', warehouse89222f8ReadbackConsumption],
  ['implementation state', state],
  ['orchestrator status', status],
]) {
  assert(source.includes('[RESOLVED/NARROWED: Catalog consumed FlipFlop 888cc13 actor-bound fixture quote and Warehouse 89222f8 live-readback consumption as current source-governance evidence]'), `${label} missing FlipFlop 888cc13 / Warehouse 89222f8 current readiness marker`);
  assert(source.includes('[RESOLVED/NARROWED: Catalog consumed Warehouse 89222f8 live current target row readback through protected Warehouse API without mutation]'), `${label} missing Warehouse 89222f8 current readiness marker`);
  assert(source.includes('[RESOLVED/NARROWED: owner statement names Sergey Stasok / Сергей Сташок as the human Payments/provider rollback owner, bank/refund authority, and bank/refund executor for Goal 24 runtime planning; runtime side effects remain blocked until exact future payment/order/provider hashes, provider proof, Orders/Warehouse/channel packets, idempotency keys, and final redacted evidence exist]'), `${label} missing Payments rollback authority hard stop`);
  assert(source.includes('[MISSING: exact selected Orders cleanup packet runtime values and sideEffectsHandled acknowledgements]'), `${label} missing Orders cleanup hard stop`);
  assert(source.includes('[MISSING: exact selected Warehouse reservation lookup state for cleanup]'), `${label} missing Warehouse hold/release duration hard stop`);
  assert(source.includes('[MISSING: final redacted evidence path for required provider, Orders, Warehouse, and channel cleanup proof]'), `${label} missing final evidence hard stop`);
}


for (const marker of [
  'source_warehouse_commit: 89222f8 docs: consume goal24 warehouse live readback',
  '[RESOLVED/NARROWED: live current target row readback at execution time captured through protected Warehouse API without mutation]',
  selectedWarehouseLookupBlocker,
  '[RESOLVED/NARROWED: final owner approval before live Warehouse reservation mutation is bounded to one Goal 24 component-line smoke attempt with max quantity 1 per component after live readback]',
  '[RESOLVED/NARROWED: owner statement names Sergey Stasok / Сергей Сташок as the human Payments/provider rollback owner, bank/refund authority, and bank/refund executor for Goal 24 runtime planning; runtime side effects remain blocked until exact future payment/order/provider hashes, provider proof, Orders/Warehouse/channel packets, idempotency keys, and final redacted evidence exist]',
  '[MISSING: exact selected Orders cleanup packet runtime values and sideEffectsHandled acknowledgements]',
  '[MISSING: final redacted evidence path for required provider, Orders, Warehouse, and channel cleanup proof]',
]) {
  assert(warehouse89222f8ReadbackConsumption.includes(marker), `Warehouse 89222f8 readback consumption report missing ${marker}`);
}
for (const boundary of [
  'mutation: false',
  'live_checkout_executed: false',
  'discount_code_created: false',
  'payment_creation: false',
  'provider_call: false',
  'refund_or_reversal: false',
  'orders_mutation: false',
  'warehouse_mutation: false',
  'channel_cleanup_mutation: false',
  'deployment: false',
  'migration: false',
  'db_write: false',
  'secret_output: false',
  'token_output: false',
  'raw_customer_or_payment_evidence: false',
]) {
  assert(warehouse89222f8ReadbackConsumption.includes(boundary), `Warehouse 89222f8 readback consumption missing boundary ${boundary}`);
}

const goal24CurrentHeadVerifierSync = read('reports/validation/VAL-GOAL-24-current-head-verifier-sync-2026-07-04.md');
const narrowedFreshAuthTokenBlocker = '[MISSING: fresh Auth actor-bound token generated through the Auth c389c1e no-print/no-decode/no-persist pattern for the exact guarded discount-fixture step]';
const narrowedAuthEvidenceBlocker = '[MISSING: sanitized auth/admin evidence path for guarded discount-code generation using the fresh selected actor-bound token]';
const historicalAuthTokenSourceBlocker = '[MISSING: approved token source path, such as an on-host token file path or in-memory handoff, with explicit no-print/no-decode/no-persist handling]';
const historicalAuthActorConfirmationBlocker = '[MISSING: confirmation that the token belongs to actor hash 4215870ba488de17 and carries app:flipflop-service:admin or global:superadmin]';
const historicalAuthAdminPathBlocker = '[MISSING: sanitized auth/admin evidence path for guarded discount-code generation]';
const historicalNamedAdminBlocker = '[MISSING: named admin/actor or approved token-handling path for guarded discount-code generation]';
const hasMarker = (source, marker) => source.includes(marker)
  || (source === state && marker === narrowedFreshAuthTokenBlocker && source.includes(historicalAuthTokenSourceBlocker))
  || (source === state && marker === narrowedAuthEvidenceBlocker && (
    source.includes(historicalAuthActorConfirmationBlocker)
    || source.includes(historicalAuthAdminPathBlocker)
    || source.includes(historicalNamedAdminBlocker)
  ));

const goal24CurrentHeadMarker = '[RESOLVED/NARROWED: Goal 24 current-head verifier sync GOAL24-CURRENT-HEADS-2026-07-04H requires Auth 2faf719 docs: complete goal10 customer data wallet rollout, Payments 0207876 docs: sync goal24 fiobanka runtime image evidence, Catalog 0e37b4c docs: sync goal24 catalog payments runtime image evidence, FlipFlop 490913a docs: clean goal24 owner wording, Orders 154c5cd docs: sync goal24 orders payments runtime image evidence, and Warehouse 0289dc2 docs: require goal24 current heads in verifier as the pre-H validation input heads; the H sync commits and later source-only status commits are validation evidence only; historical Wave A-G markers are evidence only; runtime side effects remain blocked]';
for (const [label, source] of [
  ['current-head verifier sync report', goal24CurrentHeadVerifierSync],
  ['orchestrator status', status],
  ['implementation state', state],
]) {
  if (!source.includes(goal24CurrentHeadMarker)) {
    throw new Error(label + ' missing Goal 24 current-head verifier sync marker');
  }
}

const flipflopChannelSupersessionMarker = '[RESOLVED/NARROWED: Codex Goal 24 integration thread supersedes earlier FlipFlop channel executor/runtime owner blockers; channel cleanup runtime remains blocked until bank/refund authority, exact provider proof, Orders side-effect acknowledgements, Warehouse deterministic reservation lookup state, Auth token source, and final redacted evidence path exist]';
const historicalFlipflopChannelSupersessionMarker = '[RESOLVED/NARROWED: Codex Goal 24 integration thread supersedes earlier FlipFlop channel executor/runtime owner blockers; channel cleanup runtime remains blocked until bank/refund authority, exact provider proof, Orders side-effect acknowledgements, Warehouse target facts, Auth token source, and final redacted evidence path exist]';
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
  '[MISSING: fresh Auth actor-bound token generated through the Auth c389c1e no-print/no-decode/no-persist pattern for the exact guarded discount-fixture step]',
  '[MISSING: sanitized auth/admin evidence path for guarded discount-code generation using the fresh selected actor-bound token]',
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


const currentBlockerReconciliationMarker = '[RESOLVED/NARROWED: Catalog current blocker reconciliation distinguishes historical live-run executor/runtime validation owner wording from current runtime blockers; Codex owns source-controlled validation/stop authority only, while live execution remains blocked by Auth token source, Payments bank/refund authority, exact provider proof, Orders sideEffectsHandled, exact selected Warehouse reservation lookup state, channel acknowledgement, and final redacted evidence path]';
const historicalCurrentBlockerReconciliationMarker = '[RESOLVED/NARROWED: Catalog current blocker reconciliation distinguishes historical live-run executor/runtime validation owner wording from current runtime blockers; Codex owns source-controlled validation/stop authority only, while live execution remains blocked by Auth token source, Payments bank/refund authority, exact provider proof, Orders sideEffectsHandled, exact selected Warehouse reservation lookup state, channel acknowledgement, and final redacted evidence path]';
for (const [label, source] of [
  ['approval packet', packet],
  ['channel implementation contract', channelImplementationContract],
  ['current blocker reconciliation report', currentBlockerReconciliation],
  ['implementation state', state],
  ['orchestrator status', status],
]) {
  assert(source.includes(currentBlockerReconciliationMarker) || (label === 'channel implementation contract' && source.includes(historicalCurrentBlockerReconciliationMarker)), `${label} missing current blocker reconciliation marker`);
  assert(source.includes('[RESOLVED/NARROWED: owner statement names Sergey Stasok / Сергей Сташок as the human Payments/provider rollback owner, bank/refund authority, and bank/refund executor for Goal 24 runtime planning; runtime side effects remain blocked until exact future payment/order/provider hashes, provider proof, Orders/Warehouse/channel packets, idempotency keys, and final redacted evidence exist]'), `${label} missing Payments bank/refund authority blocker`);
  assert(source.includes('[MISSING: exact selected Orders cleanup packet runtime values and sideEffectsHandled acknowledgements]'), `${label} missing Orders sideEffectsHandled blocker`);
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
  assert(source.includes('[RESOLVED/NARROWED: active Payments runtime image localhost:5000/payments-microservice:fd58097 exposes FIO_BANKA_PAYMENT_ORDER_TOKEN_CZK/EUR as present length-valid env vars without value output while FIO_BANKA_REFUND_UPLOAD_ENABLED=false]'), `${label} missing active Payments token provisioning marker`);
  assert(source.includes('[RESOLVED/NARROWED: FIO_BANKA_PAYMENT_ORDER_TOKEN_CZK and FIO_BANKA_PAYMENT_ORDER_TOKEN_EUR are present in the current ready Payments pod without value output; payment-order upload remains gated by FIO_BANKA_REFUND_UPLOAD_ENABLED=true, named bank/refund executor, exact future payment/order/provider hashes, concrete idempotency keys, and bank completion evidence]'), `${label} missing Fiobanka payment-order token-present gated marker`);
  if (label !== 'implementation state') {
    assert(source.includes('[MISSING: sanitized auth/admin evidence path for guarded discount-code generation using the fresh selected actor-bound token]'), `${label} missing narrowed discount fixture admin/token blocker`);
  }
  assert(source.includes('[RESOLVED/NARROWED: runtime readback found no linked central Orders or FlipFlop state, so no Orders/Warehouse post-paid correction is required for this evidence-only closeout]'), `${label} missing no correction required marker`);
  assert(source.includes('No live checkout, provider call, webhook replay, refund/cancel/reversal, Orders mutation, Warehouse mutation, channel cleanup, deploy, migration, DB mutation, or secret output occurred'), `${label} missing non-mutation boundary`);
}

for (const marker of [
  '[MISSING: fresh Auth actor-bound token generated through the Auth c389c1e no-print/no-decode/no-persist pattern for the exact guarded discount-fixture step]',
  '[MISSING: sanitized auth/admin evidence path for guarded discount-code generation using the fresh selected actor-bound token]',
]) {
  for (const [label, source] of [
    ['auth token proof cleanup report', authTokenProofCleanup],
    ['approval packet', packet],
    ['final readiness report', report],
    ['orchestrator status', status],
  ]) {
    assert(hasMarker(source, marker), `${label} missing current narrowed Auth marker: ${marker}`);
  }
}
for (const marker of [
  'source_flipflop_commit: 1113b9e docs: consume goal24 auth token proof in verifier',
  'source_auth_commit: c389c1e docs: record goal24 actor token provisioning proof',
  'FlipFlop `1113b9e docs: consume goal24 auth token proof in verifier`',
  'Auth `c389c1e docs: record goal24 actor token provisioning proof`',
]) {
  assert(authTokenProofCleanup.includes(marker) || status.includes(marker), `current Auth cleanup source marker missing: ${marker}`);
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
  '[MISSING: fresh Auth actor-bound token generated through the Auth c389c1e no-print/no-decode/no-persist pattern for the exact guarded discount-fixture step]',
  '[MISSING: sanitized auth/admin evidence path for guarded discount-code generation using the fresh selected actor-bound token]',
  '[MISSING: sanitized auth/admin evidence path for guarded discount-code generation using the fresh selected actor-bound token]',
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
    assert(hasMarker(source, marker), `${label} missing source-wave E marker ${marker}`);
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
    assert(hasMarker(source, marker), `${label} missing source-wave C marker ${marker}`);
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
    '[MISSING: fresh Auth actor-bound token generated through the Auth c389c1e no-print/no-decode/no-persist pattern for the exact guarded discount-fixture step]',
    '[MISSING: sanitized auth/admin evidence path for guarded discount-code generation using the fresh selected actor-bound token]',
    '[RESOLVED/NARROWED: owner statement names Sergey Stasok / Сергей Сташок as the human Payments/provider rollback owner, bank/refund authority, and bank/refund executor for Goal 24 runtime planning; runtime side effects remain blocked until exact future payment/order/provider hashes, provider proof, Orders/Warehouse/channel packets, idempotency keys, and final redacted evidence exist]',
    '[MISSING: future paymentId/orderId/variableSymbolHash/providerTransactionHash for exact smoke]',
    '[MISSING: concrete side-effectful rollback run id and cleanup idempotency keys]',
    '[MISSING: exact selected Orders cleanup packet runtime values and sideEffectsHandled acknowledgements]',
      '[RESOLVED/NARROWED: final owner approval before live Warehouse reservation mutation is bounded to one Goal 24 component-line smoke attempt with max quantity 1 per component after live readback]',
    '[MISSING: final redacted evidence path for required provider, Orders, Warehouse, and channel cleanup proof]',
  ]) {
    assert(hasMarker(source, marker), `${label} missing source-wave freeze marker ${marker}`);
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
    assert(hasMarker(source, marker), `${label} missing source-wave B marker ${marker}`);
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
  '[MISSING: fresh Auth actor-bound token generated through the Auth c389c1e no-print/no-decode/no-persist pattern for the exact guarded discount-fixture step]',
  '[MISSING: sanitized auth/admin evidence path for guarded discount-code generation using the fresh selected actor-bound token]',
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
  assert(source.includes(flipflopChannelSupersessionMarker) || source.includes(historicalFlipflopChannelSupersessionMarker), `${label} missing FlipFlop channel supersession marker`);
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
  ['paid/provider channel contract approval report', channelContractApproval],
  ['orders/payments head sync report', ordersPaymentsHeadSyncReport],
  ['FlipFlop channel supersession consumption report', flipflopChannelSupersessionReport],
]) {
  assert(!source.includes('[MISSING: owner-approved Warehouse stock hold/release window and max quantity]'), `${label} still contains stale Warehouse hold/max blocker`);
  assert(!source.includes('[MISSING: owner-approved Warehouse stock hold/release window, max quantity, target rows]'), `${label} still contains stale Warehouse hold/max/target rows blocker`);
  assert(!source.includes('[MISSING: owner-approved Orders cancellation/refund correction actor, reason, sideEffectsHandled acknowledgement, and route]'), `${label} still contains stale Orders route-missing blocker`);
  assert(!source.includes('[MISSING: Orders/Payments provider-success, provider-cancel, refund, and post-fulfillment cancellation event contract that maps to Warehouse fulfill/cancel/return calls]'), `${label} still contains stale broad Orders/Payments event-contract blocker`);
  assert(source.includes('[RESOLVED/NARROWED: candidate target component stock rows and max component quantity are source-documented from Catalog packet]'), `${label} missing source-documented Warehouse candidate facts marker`);
  assert(source.includes('[RESOLVED/NARROWED: live current target row readback at execution time captured through protected Warehouse API without mutation]'), `${label} missing Warehouse 89222f8 live readback resolution marker`);
  assert(hasWarehouseWindowMarker(source), `${label} missing renewed Warehouse window blocker`);
  assert(hasWarehouseFinalApprovalMarker(source), `${label} missing final Warehouse bounded approval blocker`);
}
for (const [label, source] of [
  ['validation report', report],
  ['approval packet', packet],
  ['implementation state', state],
  ['orchestrator status', status],
  ['paid/provider channel contract approval report', channelContractApproval],
]) {
  assert(source.includes('[RESOLVED/NARROWED: Orders/Payments completed|failed|cancelled source mapping plus Orders cancellation cleanup gate are source-defined; runtime remains blocked on exact provider proof, target order hash/state, named actor, side-effect acknowledgements, Warehouse 89222f8 readback, and final bounded approval]') || source.includes('[RESOLVED/NARROWED: Orders/Payments completed|failed|cancelled source mapping plus Orders cancellation cleanup gate are source-defined; runtime remains blocked on exact provider proof, target order hash/state, named actor, side-effect acknowledgements, Warehouse 89222f8 readback, and final mutation approval]'), `${label} missing narrowed Orders/Payments source mapping marker`);
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
  '[RESOLVED/NARROWED: live current target row readback at execution time captured through protected Warehouse API without mutation]',
  '[RESOLVED/NARROWED: final owner approval before live Warehouse reservation mutation is bounded to one Goal 24 component-line smoke attempt with max quantity 1 per component after live readback]',
]) {
  assert(catalogWarehouseBlockerWordingSync.includes(value), `Catalog Warehouse blocker wording sync report missing ${value}`);
}
for (const marker of [
  '[MISSING: fresh Auth actor-bound token generated through the Auth c389c1e no-print/no-decode/no-persist pattern for the exact guarded discount-fixture step]',
  '[MISSING: sanitized auth/admin evidence path for guarded discount-code generation using the fresh selected actor-bound token]',
  '[RESOLVED/NARROWED: owner statement names Sergey Stasok / Сергей Сташок as the human Payments/provider rollback owner, bank/refund authority, and bank/refund executor for Goal 24 runtime planning; runtime side effects remain blocked until exact future payment/order/provider hashes, provider proof, Orders/Warehouse/channel packets, idempotency keys, and final redacted evidence exist]',
  '[MISSING: future paymentId/orderId/variableSymbolHash/providerTransactionHash for exact smoke]',
  '[MISSING: concrete side-effectful rollback run id and cleanup idempotency keys]',
  '[MISSING: exact selected Orders cleanup packet runtime values and sideEffectsHandled acknowledgements]',
  '[RESOLVED/NARROWED: candidate target component stock rows and max component quantity are source-documented from Catalog packet]',
  '[RESOLVED/NARROWED: live current target row readback at execution time captured through protected Warehouse API without mutation]',
  '[RESOLVED/NARROWED: final owner approval before live Warehouse reservation mutation is bounded to one Goal 24 component-line smoke attempt with max quantity 1 per component after live readback]',
  '[RESOLVED/NARROWED: FIO_BANKA_PAYMENT_ORDER_TOKEN_CZK and FIO_BANKA_PAYMENT_ORDER_TOKEN_EUR are present in the current ready Payments pod without value output; payment-order upload remains gated by FIO_BANKA_REFUND_UPLOAD_ENABLED=true, named bank/refund executor, exact future payment/order/provider hashes, concrete idempotency keys, and bank completion evidence]',
  '[MISSING: final redacted evidence path for required provider, Orders, Warehouse, and channel cleanup proof]',
]) {
  if (marker === '[MISSING: exact selected Orders cleanup packet runtime values and sideEffectsHandled acknowledgements]') {
    assert(flipflopChannelSupersessionReport.includes(marker) || flipflopChannelSupersessionReport.includes('[MISSING: exact Orders cleanup packet and sideEffectsHandled acknowledgements]'), `FlipFlop channel supersession consumption missing blocker ${marker}`);
  } else if (marker === '[RESOLVED/NARROWED: final owner approval before live Warehouse reservation mutation is bounded to one Goal 24 component-line smoke attempt with max quantity 1 per component after live readback]') {
    assert(hasWarehouseFinalApprovalMarker(flipflopChannelSupersessionReport), `FlipFlop channel supersession consumption missing blocker ${marker}`);
  } else {
    assert(flipflopChannelSupersessionReport.includes(marker), `FlipFlop channel supersession consumption missing blocker ${marker}`);
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
  '[MISSING: fresh Auth actor-bound token generated through the Auth c389c1e no-print/no-decode/no-persist pattern for the exact guarded discount-fixture step]',
  '[RESOLVED/NARROWED: owner statement names Sergey Stasok / Сергей Сташок as the human Payments/provider rollback owner, bank/refund authority, and bank/refund executor for Goal 24 runtime planning; runtime side effects remain blocked until exact future payment/order/provider hashes, provider proof, Orders/Warehouse/channel packets, idempotency keys, and final redacted evidence exist]',
  '[MISSING: exact selected Orders cleanup packet runtime values and sideEffectsHandled acknowledgements]',
  '[MISSING: final redacted evidence path for required provider, Orders, Warehouse, and channel cleanup proof]',
]) {
  if (marker === '[MISSING: exact selected Orders cleanup packet runtime values and sideEffectsHandled acknowledgements]') {
    assert(catalogOwnerExecutorWordingSync.includes(marker) || catalogOwnerExecutorWordingSync.includes('[MISSING: exact Orders cleanup packet and sideEffectsHandled acknowledgements]'), `Catalog owner/executor wording sync report missing ${marker}`);
  } else {
    assert(catalogOwnerExecutorWordingSync.includes(marker), `Catalog owner/executor wording sync report missing ${marker}`);
  }
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



const catalogCurrentPaymentsOrdersMarker = '[RESOLVED/NARROWED: Catalog consumed Payments 445c4e7 pre-side-effect packet, Orders 6360baa Payments pre-side-effect consumption, FlipFlop 793f8ef owner-authority sync, and Auth c389c1e actor token provisioning proof as source-governance inputs only; Catalog approval planning remains hard-stopped until a separate current side-effect execution window, exact future payment/order/provider hashes, Orders sideEffectsHandled acknowledgements, exact Warehouse reservation lookup state, channel acknowledgement, provider proof or unpaid acknowledgement, and final redacted evidence exist]';
for (const [label, source] of [
  ['Catalog current Payments/Orders heads report', catalogCurrentPaymentsOrdersHeads],
  ['validation report', report],
  ['implementation state', state],
  ['orchestrator status', status],
  ['approval packet', packet],
]) {
  assert(source.includes(catalogCurrentPaymentsOrdersMarker), `${label} missing current Payments/Orders heads marker`);
  for (const blocker of [
    '[MISSING: current side-effect execution window owned by a separate newer integration owner thread]',
    '[MISSING: future paymentId/orderId/variableSymbolHash/providerTransactionHash for exact smoke]',
    '[MISSING: exact Orders target order hash/state, cancellation actor, approval id, safe reason code, idempotency key, and sideEffectsHandled payment|warehouse|notification|crm|channel acknowledgements for the future smoke]',
    '[MISSING: exact selected Warehouse reservation lookup state for cleanup]',
    '[MISSING: final redacted evidence path for required provider, Orders, Warehouse, and channel cleanup proof]',
  ]) {
    assert(source.includes(blocker), `${label} missing blocker ${blocker}`);
  }
  assert(source.includes('warehouse_mutation: false'), `${label} missing Warehouse boundary`);
  assert(source.includes('provider_call: false'), `${label} missing provider boundary`);
}
for (const markerText of [
  'id: PAYMENTS-GOAL24-PRE-SIDE-EFFECT-RUNTIME-EXECUTION-PACKET',
  '[MISSING: current side-effect execution window owned by a separate newer integration owner thread]',
]) {
  assert(paymentsPreSideEffectPacket.includes(markerText), `Payments pre-side-effect packet missing ${markerText}`);
}
assert(ordersPaymentsPreSideEffectConsumption.includes('[RESOLVED/NARROWED: Orders consumed Payments 445c4e7 pre-side-effect runtime execution packet as source-only provider-authenticity handoff evidence; Orders route invocation remains blocked until a separate current side-effect execution window'), 'Orders Payments 445c4e7 consumption marker missing');

console.log('Goal 24 refund/cancel rollback execution approval gate verified');

assert(packet.includes('historical read-only available=118/108'), 'approval packet must label Warehouse available readback historical only');
assert(packet.includes('historical read-only reserved=0/0'), 'approval packet must label Warehouse reserved readback historical only');
assert(packet.includes('[RESOLVED/NARROWED: live current target row readback at execution time captured through protected Warehouse API without mutation]'), 'approval packet must consume Warehouse 89222f8 live readback resolution marker');
