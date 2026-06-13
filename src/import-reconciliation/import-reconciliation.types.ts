export type ImportPricingRow = {
  currency?: string;
  basePrice?: number | string;
  salePrice?: number | string | null;
  priceType?: string;
};

export type ImportProductRow = {
  sku?: string;
  title?: string;
  ean?: string | null;
  categoryIds?: string[];
  categorySlugs?: string[];
  mediaUrls?: string[];
  pricing?: ImportPricingRow[];
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

export type ImportReconciliationRowResult = {
  rowNumber: number;
  sku: string | null;
  productId: string | null;
  action: ImportReconciliationAction;
  issues: ImportReconciliationIssue[];
  matchedCategoryIds: string[];
  missingCategoryRefs: string[];
  mediaUrlCount: number;
  pricingRowCount: number;
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
    issueCount: number;
  };
  rows: ImportReconciliationRowResult[];
};
