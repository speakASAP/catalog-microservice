#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const checks = [
  {
    file: 'src/bpcp-events/bpcp-process-event-consumer.service.ts',
    patterns: [
      'CATALOG_BPCP_EVENTS_CONSUMER_ENABLED',
      'bpcp.process.published.v1',
      'x-bpcp-signature',
      'x-dead-letter-exchange',
    ],
  },
  {
    file: 'src/bpcp-events/bpcp-process-event-projection.service.ts',
    patterns: [
      'catalog.discount-eligibility-facts.v1',
      'holiday-discount-2026',
      '[MISSING: final holiday eligibility fact schema or configured category/tag allow-list]',
    ],
  },
  {
    file: 'k8s/configmap.yaml',
    patterns: [
      'CATALOG_BPCP_EVENTS_CONSUMER_ENABLED: "true"',
      'CATALOG_BPCP_EVENTS_EXCHANGE: "bpcp.events"',
      'CATALOG_BPCP_EVENTS_ROUTING_KEY: "bpcp.process.published.v1"',
    ],
  },
  {
    file: 'k8s/external-secret.yaml',
    patterns: [
      'BPCP_PROCESS_SIGNING_SECRET',
      'secret/prod/business-process-control-plane',
      'CATALOG_BPCP_EVENTS_RABBITMQ_URL',
    ],
  },
  {
    file: 'docs/business-process-control-plane/HOLIDAY_DISCOUNT_ADOPTION.md',
    patterns: [
      'catalog.discount-eligibility-facts.v1',
      'catalog.bpcp.process-published.v1',
    ],
  },
];

const failures = [];
for (const check of checks) {
  const absolute = path.join(root, check.file);
  const content = fs.existsSync(absolute) ? fs.readFileSync(absolute, 'utf8') : '';
  if (!content) {
    failures.push(`${check.file}: file missing or empty`);
    continue;
  }
  for (const pattern of check.patterns) {
    if (!content.includes(pattern)) {
      failures.push(`${check.file}: missing ${pattern}`);
    }
  }
}

if (failures.length > 0) {
  console.error(JSON.stringify({ status: 'failed', failures }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  status: 'passed',
  contract: 'catalog-bpcp-process-consumer.v1',
  checkedFiles: checks.map((check) => check.file),
}, null, 2));
