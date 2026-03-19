export interface OpsDashboardFilters {
  search?: string;
  fulfillmentStatus?: string;
  financialStatus?: string;
  tag?: string;
  limit?: number;
}

export interface OpsMoneySummary {
  amount: string;
  currencyCode: string;
}

export interface OpsCustomerSummary {
  id: string;
  legacyId: string;
  name: string;
  email: string;
  phone?: string | null;
  tags: string[];
  adminUrl: string;
  opsNote: string | null;
}

export interface OpsOrderRow {
  id: string;
  legacyId: string;
  name: string;
  processedAt: string;
  ageInDays: number;
  displayFulfillmentStatus: string;
  displayFinancialStatus: string;
  totalPrice: OpsMoneySummary | null;
  tags: string[];
  adminUrl: string;
  statusPageUrl?: string | null;
  opsNote: string | null;
  customer: Pick<
    OpsCustomerSummary,
    "id" | "legacyId" | "name" | "email" | "adminUrl"
  > | null;
}

export interface OpsLineItemSummary {
  id: string;
  name: string;
  quantity: number;
  sku?: string | null;
  variantTitle?: string | null;
  imageUrl?: string | null;
  imageAlt?: string | null;
  lineTotal: OpsMoneySummary | null;
  unitPrice: OpsMoneySummary | null;
}

export interface OpsOrderDetail extends OpsOrderRow {
  createdAt: string;
  cancelledAt?: string | null;
  closedAt?: string | null;
  shippingAddress: string[];
  lineItems: OpsLineItemSummary[];
  customer: OpsCustomerSummary | null;
}

export type OpsNoteTarget = "order" | "customer";

export interface OpsMutationResult {
  ok: boolean;
  message: string;
  ownerType?: OpsNoteTarget;
  ownerId?: string;
  addTags?: string[];
  removeTags?: string[];
  note?: string;
  userErrors?: Array<{
    field?: string[] | null;
    message: string;
  }>;
}

