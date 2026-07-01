/**
 * Products API - Catalog Microservice
 */

import { apiClient } from './client';

export interface Product {
  id: string;
  sku: string;
  title: string;
  description?: string;
  descriptionRich?: ProductContentDocument | null;
  brand?: string;
  manufacturer?: string;
  ean?: string;
  weightKg?: number;
  dimensionsCm?: {
    length?: number;
    width?: number;
    height?: number;
  };
  isActive: boolean;
  lifecycle?: 'draft' | 'active' | 'archived' | 'needs_review';
  createdAt: string;
  updatedAt: string;
  categories?: Array<{ id: string; name: string }>;
}

export type ProductContentBlock =
  | { type: 'heading'; level?: number; text?: string }
  | { type: 'paragraph'; text?: string }
  | { type: 'bulleted_list'; items?: string[] }
  | { type: 'numbered_list'; items?: string[] }
  | { type: 'table'; rows?: string[][] }
  | { type: 'callout'; text?: string; tone?: string };

export interface ProductContentDocument {
  version: 1;
  locale?: string;
  blocks: ProductContentBlock[];
}

export interface BazosIdentitySummary {
  id: string;
  displayName?: string | null;
  contactName?: string | null;
  defaultLocation?: string | null;
  status?: string | null;
  reviewState?: string | null;
  sessionState?: string | null;
  activeAdCount?: number | null;
  verificationExpiresAt?: string | null;
  nextPublishNotBefore?: string | null;
  canSell: boolean;
  blockingReasons: string[];
}

export interface BazosAccountStatus {
  connected: boolean;
  active: boolean;
  canSell: boolean;
  authority: 'bazos';
  message: string;
  selectedIdentity: BazosIdentitySummary | null;
  identities: BazosIdentitySummary[];
  nextAction: string;
  dependencyStatus?: number | null;
  dependencyMessage?: string | null;
}

export interface BazosSellActionResponse {
  success: boolean;
  action: string;
  productId: string;
  authority: 'bazos';
  policyAuthority: 'bazos';
  publishAuthority: 'bazos';
  draft?: any;
  identity?: any;
  categoryMapping?: any;
  policyStatus?: any;
  requiresConfirmation?: boolean;
  canQueueAfterConfirmation?: boolean;
  requiresHumanAction?: any;
  nextAction?: string;
  message?: string;
  reason?: string;
}

export interface AukroAccountSummary {
  id: string;
  username?: string | null;
  accountName?: string | null;
  isActive?: boolean | null;
}

export interface AukroAccountStatus {
  connected: boolean;
  active: boolean;
  canSell: boolean;
  authority: 'aukro';
  message: string;
  selectedAccount: AukroAccountSummary | null;
  accounts: AukroAccountSummary[];
  nextAction: string;
  dependencyStatus?: number | null;
  dependencyMessage?: string | null;
}

export interface AukroDraftStatus {
  success: boolean;
  action: string;
  productId: string;
  authority: 'aukro';
  policyAuthority?: 'aukro';
  publishAuthority?: 'aukro';
  account?: AukroAccountSummary | null;
  offer?: any;
  offerId?: string | null;
  draft?: any;
  draftStatus?: string | null;
  blockers?: string[];
  compliancePolicy?: any;
  sourceSnapshot?: any;
  requiresConfirmation?: boolean;
  canQueueAfterConfirmation?: boolean;
  requiresHumanAction?: {
    required?: boolean;
    reason?: string | null;
    policyFailures?: string[];
    error?: string | null;
  };
  nextAction?: string;
  message?: string;
  reason?: string;
  blocked?: boolean;
  dependencyStatus?: number | null;
  dependencyMessage?: string | null;
}

export interface ProductQuery {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  lifecycle?: 'draft' | 'active' | 'archived' | 'needs_review';
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface BazosListingStatus {
  publishedOnBasus: boolean;
  listingUrl?: string | null;
  expiresAt?: string | null;
  draft?: {
    id?: string;
    publishStatus?: string;
    bazosAdId?: string | null;
    listingUrl?: string | null;
    publishedOnBasus?: boolean;
    expiresAt?: string | null;
  } | null;
  identity?: {
    displayName?: string | null;
    contactName?: string | null;
    defaultLocation?: string | null;
  } | null;
  requiresHumanAction?: {
    required?: boolean;
    reason?: string | null;
  };
  nextAction?: string;
}


export interface AllegroDraftSummary {
  id?: string;
  accountId?: string | null;
  catalogProductId?: string | null;
  allegroOfferId?: string | null;
  title?: string | null;
  description?: string | null;
  categoryId?: string | null;
  price?: number | string | null;
  currency?: string | null;
  quantity?: number | null;
  stockQuantity?: number | null;
  publicationStatus?: string | null;
  status?: string | null;
  updatedAt?: string | null;
}

export interface AllegroSellActionResponse {
  success?: boolean;
  action?: string;
  productId?: string;
  authority?: 'allegro';
  draft?: AllegroDraftSummary | null;
  attempt?: {
    id?: string;
    status?: string | null;
    blockedReasons?: Array<{ gate?: string; reason?: string }> | null;
  } | null;
  accountChoices?: Array<{ id: string; name?: string | null; isActive?: boolean; tokenExpiresAt?: string | null }>;
  categoryChoice?: { selectedCategoryId?: string | null; source?: string | null } | null;
  listingUrl?: string | null;
  status?: string | null;
  nextAction?: string | null;
  message?: string | null;
  blocked?: boolean;
  reason?: string;
  dependencyStatus?: number | null;
  dependencyMessage?: string | null;
  requiresConfirmation?: boolean;
  canEditDraft?: boolean;
  canConfirmPublish?: boolean;
}


export type MarketplaceFieldSource = 'canonical' | 'override' | 'externalRef' | 'sourceData';

export interface MarketplaceField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'json';
  source: MarketplaceFieldSource;
  canonicalPath?: string;
  marketplacePath?: string;
  aliases?: string[];
  editable?: boolean;
  description?: string;
  value?: any;
}

export interface MarketplaceFieldsResponse {
  product: Product;
  marketplace: { marketplace: string; label: string; description: string };
  profile: {
    id: string | null;
    productId: string;
    marketplace: string;
    status: string;
    canonicalAliases: Record<string, any>;
    overrides: Record<string, any>;
    externalRefs: Record<string, any>;
    sourceData: Record<string, any> | null;
    updatedAt?: string | null;
  };
  fields: MarketplaceField[];
}

export interface UpdateMarketplaceFieldsPayload {
  canonical?: Record<string, any>;
  overrides?: Record<string, any>;
  externalRefs?: Record<string, any>;
  sourceData?: Record<string, any> | null;
  status?: string;
}

export type MarketplaceContentKey = 'allegro' | 'bazos' | 'aukro' | 'flipflop';

export interface MarketplaceContentPreview {
  marketplace: MarketplaceContentKey;
  label: string;
  format: 'html' | 'plain_text' | 'structured_blocks';
  product: {
    id: string;
    sku: string;
    title: string;
  };
  content: {
    title: string;
    plainText: string;
    html?: string;
    blocks?: ProductContentBlock[];
    sections?: Array<{ title?: string; body: string }>;
  };
  source: {
    canonicalDocumentVersion: number;
    legacyDescriptionFallback: boolean;
    sourceHash: string;
    generatedAt: string;
  };
  overridesApplied: string[];
  warnings: string[];
}

export interface ProductContentPreviewsResponse {
  productId: string;
  supportedMarketplaces: Array<{ marketplace: MarketplaceContentKey; label: string; format: MarketplaceContentPreview['format'] }>;
  previews: MarketplaceContentPreview[];
}


export type MarketplacePublicationChannel = 'allegro' | 'bazos' | 'aukro' | 'flipflop';

export interface BulkMarketplacePublicationRequest {
  productIds: string[];
  marketplaces: MarketplacePublicationChannel[];
  options?: Partial<Record<MarketplacePublicationChannel, any>>;
}

export interface BulkMarketplacePublicationResult {
  productId: string;
  marketplace: MarketplacePublicationChannel;
  success: boolean;
  blocked: boolean;
  action?: string | null;
  nextAction?: string | null;
  listingUrl?: string | null;
  message?: string | null;
  reason?: string | null;
  dependencyStatus?: number | null;
  dependencyMessage?: string | null;
  data?: any;
}

export interface BulkMarketplacePublicationResponse {
  success: boolean;
  action: 'bulk_marketplace_publication';
  requestedProductIds: string[];
  marketplaces: MarketplacePublicationChannel[];
  totals: {
    requested: number;
    succeeded: number;
    failed: number;
    blocked: number;
  };
  results: BulkMarketplacePublicationResult[];
}


export interface ProductSalesChannel {
  productId: string;
  channel: string;
  currency: string;
  orderCount: number;
  quantitySold: number;
  grossSales: number;
  lastOrderedAt: string | null;
  status: 'available' | 'zero' | 'unavailable';
  unavailableReason?: string;
}

export interface ProductSalesHistoryEvent {
  channel: string;
  orderedAt: string | null;
  currency: string;
  quantitySold: number;
  grossSales: number;
  status: string | null;
}

export interface ProductSalesStatistics {
  productId: string;
  source: 'orders';
  sourceStatus: 'available' | 'unavailable';
  allowedChannels: string[];
  currencyStrategy: string;
  conversion: string;
  totals: {
    orderCount: number;
    quantitySold: number;
    grossSalesByCurrency: Array<{ currency: string; amount: number }>;
  };
  channels: ProductSalesChannel[];
  recentHistory: ProductSalesHistoryEvent[];
  unavailableReason?: string;
}


export type WarehouseLogisticsRouteType = "local_fulfillment" | "supplier_replenishment" | "supplier_dropship" | "unclassified";

export interface ProductWarehouseAvailabilityWarehouse {
  warehouseId: string;
  warehouseCode?: string | null;
  warehouseName?: string | null;
  warehouseType?: string | null;
  supplierId?: string | null;
  quantity: number;
  reserved: number;
  available: number;
}

export interface ProductWarehouseLogisticsOption {
  productId: string;
  warehouseId: string;
  warehouseCode: string;
  warehouseName: string;
  warehouseType: string;
  originType: string;
  supplierId: string | null;
  priority: number;
  quantity: number;
  reserved: number;
  available: number;
  routeType: WarehouseLogisticsRouteType;
  routeLabel: string;
  canReserveFromWarehouse: boolean;
  requiresSupplierCoordination: boolean;
  legs: Array<{
    sequence: number;
    from: string;
    to: string;
    responsibility: "warehouse" | "supplier" | "mixed";
  }>;
}

export interface ProductWarehouseLogisticsPlan {
  generatedAt: string;
  productId: string;
  totals: {
    totalQuantity: number;
    totalReserved: number;
    totalAvailable: number;
    routeCount: number;
    ownAvailable: number;
    supplierAvailable: number;
    dropshipAvailable: number;
  };
  preferredRoute: WarehouseLogisticsRouteType | null;
  options: ProductWarehouseLogisticsOption[];
}

export interface ProductWarehouseAvailabilityItem {
  productId: string;
  sku: string;
  source: "warehouse";
  totalQuantity: number;
  totalReserved: number;
  totalAvailable: number;
  warehouses: ProductWarehouseAvailabilityWarehouse[];
  logistics: ProductWarehouseLogisticsPlan | null;
}

export interface ProductWarehouseAvailabilityResponse {
  requestedProductIds: string[];
  invalidProductIds: string[];
  items: ProductWarehouseAvailabilityItem[];
}

export const productsApi = {
  async getProducts(query?: ProductQuery) {
    const params = new URLSearchParams();
    if (query?.page) params.append('page', query.page.toString());
    if (query?.limit) params.append('limit', query.limit.toString());
    if (query?.search) params.append('search', query.search);
    if (query?.isActive !== undefined) params.append('isActive', query.isActive.toString());
    if (query?.lifecycle) params.append('lifecycle', query.lifecycle);

    const queryString = params.toString();
    return apiClient.get<Product[] | PaginatedResponse<Product>>(`/products${queryString ? `?${queryString}` : ''}`);
  },

  async getProduct(id: string) {
    return apiClient.get<Product>(`/products/${id}`);
  },

  async getProductBySku(sku: string) {
    return apiClient.get<Product>(`/products/sku/${sku}`);
  },

  async createProduct(data: Partial<Product>) {
    return apiClient.post<Product>('/products', data);
  },

  async updateProduct(id: string, data: Partial<Product>) {
    return apiClient.put<Product>(`/products/${id}`, data);
  },


  async getMarketplaceFields(id: string, marketplace: string) {
    return apiClient.get<MarketplaceFieldsResponse>(`/products/${id}/marketplace-fields/${marketplace}`);
  },

  async updateMarketplaceFields(id: string, marketplace: string, data: UpdateMarketplaceFieldsPayload) {
    return apiClient.put<MarketplaceFieldsResponse>(`/products/${id}/marketplace-fields/${marketplace}`, data);
  },

  async getContentPreviews(id: string) {
    return apiClient.get<ProductContentPreviewsResponse>(`/products/${id}/content-previews`);
  },

  async getContentPreview(id: string, marketplace: MarketplaceContentKey) {
    return apiClient.get<MarketplaceContentPreview>(`/products/${id}/content-previews/${marketplace}`);
  },


  async getSalesStatistics(id: string) {
    return apiClient.get<ProductSalesStatistics>(`/products/${id}/sales-statistics`);
  },


  async getAvailabilityBatch(productIds: string[]) {
    return apiClient.post<ProductWarehouseAvailabilityResponse>("/products/availability/batch", { productIds });
  },

  async getBazosStatus(id: string) {
    return apiClient.get<BazosListingStatus>(`/products/${id}/bazos-status`);
  },

  async getBazosAccountStatus() {
    return apiClient.get<BazosAccountStatus>('/products/bazos/account-status');
  },

  async getAukroStatus(id: string) {
    return apiClient.get<AukroDraftStatus>(`/products/${id}/aukro-status`);
  },

  async getAukroAccountStatus() {
    return apiClient.get<AukroAccountStatus>('/products/aukro/account-status');
  },

  async sellOnAukro(id: string, data: { accountId?: string; requestedBy?: string; policyEvidence?: any } = {}) {
    return apiClient.post<AukroDraftStatus>(`/products/${id}/sell-on-aukro`, data);
  },

  async sellOnBazos(id: string, data: { identityId: string; category: string; location?: string; useCallerBazosIdentity?: boolean }) {
    return apiClient.post<BazosSellActionResponse>(`/products/${id}/sell-on-bazos`, data);
  },


  async getAllegroStatus(id: string) {
    return apiClient.get<AllegroSellActionResponse>(`/products/${id}/allegro-status`);
  },

  async sellOnAllegro(id: string, data: { categoryId?: string; quantity?: number; forceNewDraft?: boolean; title?: string; description?: string; price?: number } = {}) {
    return apiClient.post<AllegroSellActionResponse>(`/products/${id}/sell-on-allegro`, data);
  },

  async updateAllegroDraft(id: string, data: { offerId?: string; title?: string; description?: string; categoryId?: string; price?: number; quantity?: number }) {
    return apiClient.put<AllegroSellActionResponse>(`/products/${id}/allegro-draft`, data);
  },

  async confirmAllegroPublish(id: string) {
    return apiClient.post<AllegroSellActionResponse>(`/products/${id}/allegro-confirm`, {});
  },

  async bulkPublishProducts(data: BulkMarketplacePublicationRequest) {
    return apiClient.post<BulkMarketplacePublicationResponse>('/products/publications/bulk', data);
  },

  async getFlipFlopStatus(id: string) {
    return apiClient.get(`/products/${id}/flipflop-status`);
  },

  async sellOnFlipFlop(id: string) {
    return apiClient.post(`/products/${id}/sell-on-flipflop`, {});
  },

  async deleteProduct(id: string) {
    return apiClient.delete(`/products/${id}`);
  },

  async hardDeleteProduct(id: string) {
    return apiClient.delete(`/products/${id}/hard`);
  },
};
