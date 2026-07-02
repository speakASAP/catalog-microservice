export type ImportPricingRow = {
  currency?: string;
  basePrice?: number | string;
  salePrice?: number | string | null;
  priceType?: string;
};

export type ImportProductRow = {
  sku?: string;
  title?: string;
  description?: string | null;
  descriptionRich?: unknown;
  ean?: string | null;
  categoryIds?: string[];
  categorySlugs?: string[];
  mediaUrls?: string[];
  pricing?: ImportPricingRow[];
  quantity?: number | string | null;
  stockQuantity?: number | string | null;
  sourceQuantity?: number | string | null;
};

export type ImportReconciliationRequest = {
  products?: ImportProductRow[];
};

export type ImportReconciliationIssueSeverity = "blocking" | "warning";

export type ImportReconciliationIssue = {
  code: string;
  field: string;
  message: string;
  severity: ImportReconciliationIssueSeverity;
};

export type ImportReconciliationAction = "create" | "update" | "skip";

export type ImportWarehouseStockPreview = {
  source: "warehouse";
  sourceQuantity: number | null;
  resolvedQuantity: number;
  defaulted: boolean;
  ownsStockInCatalog: false;
};

export type ImportReconciliationRowResult = {
  rowNumber: number;
  sku: string | null;
  productId: string | null;
  action: ImportReconciliationAction;
  issues: ImportReconciliationIssue[];
  qualityBlockingIssues: ImportReconciliationIssue[];
  matchedCategoryIds: string[];
  missingCategoryRefs: string[];
  mediaUrlCount: number;
  pricingRowCount: number;
  targetLifecycle: "draft" | "active" | null;
  targetIsActive: boolean | null;
  publishable: boolean;
  warehouseStock: ImportWarehouseStockPreview;
};

export type ImportReconciliationReport = {
  dryRun: true;
  destructiveActionRequired: false;
  requiresHumanReview: boolean;
  totals: {
    inputRows: number;
    validRows: number;
    createCandidates: number;
    updateCandidates: number;
    skippedRows: number;
    draftCandidates: number;
    nonPublishableCandidates: number;
    issueCount: number;
  };
  rows: ImportReconciliationRowResult[];
};
