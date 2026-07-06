export type BusinessHealthStatus = "pass" | "warn" | "blocked";

export type CatalogBusinessHealthSourceRef = {
  label: string;
  path: string;
  contractId?: string;
  method?: "GET" | "POST";
  mutating: boolean;
  protected: boolean;
  evidenceFields: string[];
};

export type CatalogBusinessHealthIntentChain = {
  vision: string;
  goalImpact: string;
  system: string;
  feature: string;
  task: string;
  executionPlan: string;
  codingPrompt: string;
  code: string[];
  validation: string[];
};

export type CatalogChannelAvailabilityBusinessHealthEnvelope = {
  contractId: "catalog.channel_availability_business_health.v1";
  businessHealthContract: "stock-order-marketplace-business-health.v1";
  service: "catalog-microservice";
  endpoint: "/api/business-health/channel-availability";
  generatedAt: string;
  status: BusinessHealthStatus;
  mutatesCatalog: false;
  mutatesWarehouse: false;
  mutatesMarketplace: false;
  runtimeDataQueried: false;
  productionDbQueried: false;
  liveSyntheticMutationAuthorized: false;
  summary: string;
  sourceRefs: CatalogBusinessHealthSourceRef[];
  healthPlanes: {
    catalogProductTruth: BusinessHealthStatus;
    warehouseAvailabilityForwarding: BusinessHealthStatus;
    warehouseCoverageDiagnostics: BusinessHealthStatus;
    channelReadinessAggregation: BusinessHealthStatus;
    flipflopProjectionReadiness: BusinessHealthStatus;
    liveRuntimeProof: "blocked";
  };
  blockers: string[];
  intentPreservation: CatalogBusinessHealthIntentChain;
};
