#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

function read(relativePath) {
  const absolute = path.join(root, relativePath);
  return fs.existsSync(absolute) ? fs.readFileSync(absolute, "utf8") : "";
}

const checks = [
  {
    file: "src/business-health/business-health.controller.ts",
    patterns: [
      '@Controller("business-health")',
      '@Get("channel-availability")',
      "getChannelAvailabilityEnvelope",
      "BusinessHealthService",
    ],
  },
  {
    file: "src/business-health/business-health.service.ts",
    patterns: [
      'const ENDPOINT = "/api/business-health/channel-availability" as const;',
      "catalog.channel_availability_business_health.v1",
      "stock-order-marketplace-business-health.v1",
      'service: "catalog-microservice"',
      "mutatesCatalog: false",
      "mutatesWarehouse: false",
      "mutatesMarketplace: false",
      "runtimeDataQueried: false",
      "productionDbQueried: false",
      "liveSyntheticMutationAuthorized: false",
      "GET /api/products/:id/channel-readiness",
      "POST /api/products/availability/batch",
      "POST /api/products/availability/coverage",
      "GET /api/products/availability/coverage/audit",
      "POST /api/products/projections/flipflop/batch",
      "[MISSING: approved live Catalog channel availability runtime evidence packet for target products]",
      "intentPreservation",
    ],
  },
  {
    file: "src/business-health/business-health.types.ts",
    patterns: [
      "CatalogChannelAvailabilityBusinessHealthEnvelope",
      'contractId: "catalog.channel_availability_business_health.v1"',
      'businessHealthContract: "stock-order-marketplace-business-health.v1"',
      'endpoint: "/api/business-health/channel-availability"',
      "mutatesCatalog: false",
      "mutatesWarehouse: false",
      "mutatesMarketplace: false",
      "runtimeDataQueried: false",
      "productionDbQueried: false",
    ],
  },
  {
    file: "src/business-health/business-health.module.ts",
    patterns: ["BusinessHealthController", "BusinessHealthService", "BusinessHealthModule"],
  },
  {
    file: "src/app.module.ts",
    patterns: ["BusinessHealthModule", "./business-health/business-health.module"],
  },
  {
    file: "docs/orchestrator/2026-07-06-catalog-channel-business-health-handoff.md",
    patterns: [
      "GET /api/business-health/channel-availability",
      "catalog.channel_availability_business_health.v1",
      "stock-order-marketplace-business-health.v1",
      "mutatesCatalog=false",
      "runtimeDataQueried=false",
      "productionDbQueried=false",
      "[MISSING: approved live Catalog channel availability runtime evidence packet for target products]",
      "Vision -> Goal Impact -> System -> Feature -> Task -> Execution Plan -> Coding Prompt -> Code -> Validation",
    ],
  },
  {
    file: "package.json",
    patterns: ["verify:business-health-catalog-channel-contract"],
  },
];

const forbiddenBusinessHealthPatterns = [
  "@InjectRepository",
  "Repository<",
  "TypeOrmModule.forFeature",
  ".find(",
  ".findOne(",
  ".save(",
  ".update(",
  ".delete(",
  "createQueryBuilder",
  "fetch(",
  "axios.",
  "HttpService",
  "sellOnFlipFlop",
  "prepareFlipFlopSale",
  "publish",
  "delist",
  "relist",
  "reserve(",
  "createReservation",
  "confirmReservation",
  "releaseReservation",
  "stock mutation",
];

const failures = [];
for (const check of checks) {
  const content = read(check.file);
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

for (const relativePath of [
  "src/business-health/business-health.controller.ts",
  "src/business-health/business-health.service.ts",
  "src/business-health/business-health.module.ts",
  "src/business-health/business-health.types.ts",
]) {
  const content = read(relativePath);
  for (const pattern of forbiddenBusinessHealthPatterns) {
    if (content.includes(pattern)) {
      failures.push(`${relativePath}: forbidden pattern ${pattern}`);
    }
  }
}

if (failures.length > 0) {
  console.error(JSON.stringify({
    status: "failed",
    contract: "catalog.channel_availability_business_health.v1",
    failures,
  }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  status: "passed",
  contract: "catalog.channel_availability_business_health.v1",
  endpoint: "/api/business-health/channel-availability",
  businessHealthContract: "stock-order-marketplace-business-health.v1",
  checkedFiles: checks.map((check) => check.file),
  checkedAssertions: checks.reduce((total, check) => total + check.patterns.length, 0),
  forbiddenBusinessHealthPatternsChecked: forbiddenBusinessHealthPatterns.length,
}, null, 2));
