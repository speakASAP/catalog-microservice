export type ChannelReadinessName = "flipflop" | "bazos_draft" | string;

export type ChannelReadinessStatus = "ready" | "blocked" | "needs_review";

export type ChannelReadinessSeverity = "blocking" | "warning";

export type ChannelAuthority = "catalog" | "flipflop" | "bazos" | string;

export type ChannelWarehouseCoverageFacts = {
  sellableWithWarehouse: boolean;
  coverageStatus: "covered" | "missing_stock" | "missing_route" | string;
  totalAvailable: number;
  routeCount: number;
  stockOrigin?: string | null;
  blockingReasons: string[];
};

export type ChannelReadinessIssue = {
  code: string;
  field?: string;
  severity: ChannelReadinessSeverity;
  message: string;
  nextAction: string;
};

export type ChannelReadiness = {
  channel: ChannelReadinessName;
  ready: boolean;
  status: ChannelReadinessStatus;
  missingFields: string[];
  issues: ChannelReadinessIssue[];
  nextAction: string;
  authority: ChannelAuthority;
  warehouseCoverage?: ChannelWarehouseCoverageFacts | null;
};

export type ChannelReadinessResponse = {
  productId: string;
  sku: string;
  ready: boolean;
  channels: ChannelReadiness[];
};
