// SEF API endpoint constants.
// Base URL switches between prod and demo per credentials.

export const SEF_BASE = {
  prod: "https://efaktura.mfin.gov.rs",
  demo: "https://demoefaktura.mfin.gov.rs",
} as const;

export function baseUrl(isDemo: boolean): string {
  return isDemo ? SEF_BASE.demo : SEF_BASE.prod;
}

// All paths are relative to baseUrl + /api/publicApi
export const PATH = {
  // outbound (sales-invoice)
  salesInvoiceUbl: "/api/publicApi/sales-invoice/ubl",
  salesInvoiceUblUpload: "/api/publicApi/sales-invoice/ubl/upload",
  salesInvoice: "/api/publicApi/sales-invoice",
  salesInvoiceXml: "/api/publicApi/sales-invoice/xml",
  salesInvoiceSignature: "/api/publicApi/sales-invoice/signature",
  salesInvoiceIds: "/api/publicApi/sales-invoice/ids",
  salesInvoiceCancel: "/api/publicApi/sales-invoice/cancel",
  salesInvoiceStorno: "/api/publicApi/sales-invoice/storno",
  salesInvoiceChanges: "/api/publicApi/sales-invoice/changes",

  // inbound (purchase-invoice)
  purchaseInvoiceIds: "/api/publicApi/purchase-invoice/ids",
  purchaseInvoice: "/api/publicApi/purchase-invoice",
  purchaseInvoiceXml: "/api/publicApi/purchase-invoice/xml",
  purchaseInvoiceSignature: "/api/publicApi/purchase-invoice/signature",
  purchaseInvoiceAction: "/api/publicApi/purchase-invoice/acceptRejectPurchaseInvoice",
  purchaseInvoiceChanges: "/api/publicApi/purchase-invoice/changes",

  // company / eligibility
  checkCompany: "/api/publicApi/Company/CheckIfCompanyRegisteredOnEfaktura",
  getAllCompanies: "/api/publicApi/Company/GetAllCompanies",

  // subscribe to next-day email notifications
  subscribe: "/api/publicApi/subscribe",
} as const;

export type SefPath = (typeof PATH)[keyof typeof PATH];
