import { api } from "@/lib/api/client";

// ─── Daily Logs Report ────────────────────────────────────────────────────────

export interface DailyLogReportEntry {
  id: string;
  logDate: string;
  isAdditional: boolean;
  termNameAr?: string | null;
  termNameEn?: string | null;
  itemNameAr?: string | null;
  itemNameEn?: string | null;
  additionalNameAr?: string | null;
  additionalNameEn?: string | null;
  quantity?: number | null;
  unit?: string | null;
  unitPrice?: number | null;
  amount: number;
}

export interface DailyLogReportHeader {
  project: {
    id: string;
    name: string;
    location?: string | null;
    unitType?: string | null;
    supervisionPercent?: number | null;
  };
  client: { name: string } | null;
  from: string;
  to: string;
}

export interface DailyLogReportTotals {
  count: number;
  totalSpent: number;
  termItemSpent: number;
  additionalsSpent: number;
}

export interface DailyLogsReportResponse {
  header: DailyLogReportHeader;
  entries: DailyLogReportEntry[];
  totals: DailyLogReportTotals;
}

// ─── Final Invoice ────────────────────────────────────────────────────────────

export interface FinalInvoiceItem {
  itemId: string;
  itemNameAr: string;
  itemNameEn?: string | null;
  totalQuantity: number;
  totalAmount: number;
}

export interface FinalInvoiceTerm {
  termId: string;
  termNameAr: string;
  termNameEn?: string | null;
  items: FinalInvoiceItem[];
  termTotal: number;
}

export interface FinalInvoiceAdditional {
  nameAr: string;
  nameEn?: string | null;
  totalQuantity: number;
  totalAmount: number;
}

export interface FinalInvoiceResponse {
  header: {
    project: {
      id: string;
      name: string;
      location?: string | null;
      unitType?: string | null;
      supervisionPercent?: number | null;
    };
    client: { name: string } | null;
  };
  terms: FinalInvoiceTerm[];
  additionals: FinalInvoiceAdditional[];
  totalSpent: number;
  supervisionPercent: number;
  supervisionFee: number;
  invoiceTotal: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildQs(params: Record<string, string | undefined>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") q.set(k, v);
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const reportsApi = {
  getDailyLogsReport: (projectId: string, from?: string, to?: string) =>
    api.get<DailyLogsReportResponse>(
      `/reports/daily-logs${buildQs({ projectId, from, to })}`
    ),

  getFinalInvoice: (projectId: string) =>
    api.get<FinalInvoiceResponse>(
      `/reports/final-invoice${buildQs({ projectId })}`
    ),
};
