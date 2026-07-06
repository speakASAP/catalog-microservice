import { Injectable } from "@nestjs/common";
import { CatalogChannelAvailabilityBusinessHealthEnvelope } from "./business-health.types";

const ENDPOINT = "/api/business-health/channel-availability" as const;
const CONTRACT_ID = "catalog.channel_availability_business_health.v1" as const;
const BUSINESS_HEALTH_CONTRACT = "stock-order-marketplace-business-health.v1" as const;

@Injectable()
export class BusinessHealthService {
  getChannelAvailabilityEnvelope(): CatalogChannelAvailabilityBusinessHealthEnvelope {
    return {
      contractId: CONTRACT_ID,
      businessHealthContract: BUSINESS_HEALTH_CONTRACT,
      service: "catalog-microservice",
      endpoint: ENDPOINT,
      generatedAt: new Date().toISOString(),
      status: "blocked",
      mutatesCatalog: false,
      mutatesWarehouse: false,
      mutatesMarketplace: false,
      runtimeDataQueried: false,
      productionDbQueried: false,
      liveSyntheticMutationAuthorized: false,
      summary:
        "Catalog source proves the channel availability/listing distribution read surfaces and ownership boundaries; live product/channel evidence remains blocked until an approved runtime packet exists.",
      sourceRefs: [
        {
          label: "Catalog product channel readiness",
          path: "GET /api/products/:id/channel-readiness",
          contractId: "catalog.product-channel-readiness.v1",
          method: "GET",
          mutating: false,
          protected: false,
          evidenceFields: [
            "productId",
            "sku",
            "channels[].ready",
            "channels[].status",
            "channels[].issues",
            "channels[].authority",
            "channels[].warehouseCoverage",
          ],
        },
        {
          label: "Catalog Warehouse availability forwarding",
          path: "POST /api/products/availability/batch",
          contractId: "catalog.warehouse-availability-forwarding.v1",
          method: "POST",
          mutating: false,
          protected: true,
          evidenceFields: [
            "source=warehouse",
            "totalQuantity",
            "totalReserved",
            "totalAvailable",
            "warehouses[]",
            "logistics",
          ],
        },
        {
          label: "Catalog Warehouse sellability coverage",
          path: "POST /api/products/availability/coverage",
          contractId: "catalog.warehouse-coverage.v1",
          method: "POST",
          mutating: false,
          protected: true,
          evidenceFields: [
            "coverageStatus",
            "stockOrigin",
            "sellableWithWarehouse",
            "routeCount",
            "preferredRoute",
            "blockingReasons",
          ],
        },
        {
          label: "Catalog Warehouse coverage audit",
          path: "GET /api/products/availability/coverage/audit",
          contractId: "catalog.warehouse-coverage-audit.v1",
          method: "GET",
          mutating: false,
          protected: true,
          evidenceFields: [
            "pagination",
            "totals",
            "items[].coverageStatus",
            "items[].sellableWithWarehouse",
            "items[].blockingReasons",
          ],
        },
        {
          label: "FlipFlop product truth projection",
          path: "POST /api/products/projections/flipflop/batch",
          contractId: "catalog.flipflop-projection.v1",
          method: "POST",
          mutating: false,
          protected: true,
          evidenceFields: [
            "stockQuantity",
            "warehouse.totalAvailable",
            "availability.totalAvailable",
            "readiness",
            "pricing",
          ],
        },
        {
          label: "Catalog channel business-health handoff",
          path: "docs/orchestrator/2026-07-06-catalog-channel-business-health-handoff.md",
          contractId: CONTRACT_ID,
          mutating: false,
          protected: false,
          evidenceFields: ["ownership boundaries", "read-only evidence sources", "blockers", "merge order"],
        },
      ],
      healthPlanes: {
        catalogProductTruth: "warn",
        warehouseAvailabilityForwarding: "warn",
        warehouseCoverageDiagnostics: "warn",
        channelReadinessAggregation: "warn",
        flipflopProjectionReadiness: "warn",
        liveRuntimeProof: "blocked",
      },
      blockers: [
        "[MISSING: approved live Catalog channel availability runtime evidence packet for target products]",
        "[MISSING: exact target product IDs and channel list for live business-health proof]",
        "[MISSING: approved protected Catalog service token or JWT for live coverage/projection/readiness checks]",
        "[MISSING: channel-owner credentials/ownership packet for marketplace-side listing status proof]",
        "[MISSING: approved Warehouse stock authority runtime packet if live Warehouse totals must be compared]",
      ],
      intentPreservation: {
        vision:
          "Catalog remains product truth while Warehouse owns stock/reservations and channel services own marketplace publication state.",
        goalImpact:
          "Operators can see whether Catalog has the read-only evidence surfaces needed for stock-order-marketplace business health without changing products, stock, listings, or credentials.",
        system:
          "Business Process Control Plane consumes service-owned evidence envelopes from Catalog, Warehouse, Orders, Suppliers, and marketplace services.",
        feature:
          "Catalog service-owned read-only channel availability/listing distribution business-health evidence envelope.",
        task:
          "Expose a source-only endpoint that maps Catalog channel availability evidence sources and fail-closed runtime blockers.",
        executionPlan:
          "Add src/business-health endpoint/service/types, wire BusinessHealthModule, add static verifier, update handoff docs, run verifier/build/diff checks, commit and push without deploy.",
        codingPrompt:
          "Do not query production data, call live Warehouse/channel APIs, mutate Catalog/Warehouse/marketplace state, change auth semantics, or hide [MISSING: ...] blockers.",
        code: [
          "src/business-health/business-health.controller.ts",
          "src/business-health/business-health.module.ts",
          "src/business-health/business-health.service.ts",
          "src/business-health/business-health.types.ts",
          "src/app.module.ts",
          "scripts/verify-business-health-catalog-channel-contract.js",
          "docs/orchestrator/2026-07-06-catalog-channel-business-health-handoff.md",
        ],
        validation: [
          "npm run verify:business-health-catalog-channel-contract",
          "npm run build",
          "git diff --check",
        ],
      },
    };
  }
}
