/**
 * Quotation PDF — produced by rendering a styled RTL HTML document with the
 * browser's native print engine (perfect Arabic shaping, professional design).
 * See lib/pdf/templates.ts (design) and lib/pdf/render.ts (engine).
 */
import { loadFonts, printDocument } from '@/lib/pdf/render';
import { buildQuotationHtml } from '@/lib/pdf/templates';

export interface QuotationPdfLine {
  order: number;
  pricingMode: 'UNIT' | 'LUMP_SUM';
  unit?: string | null;
  quantity?: number | string | null;
  unitPrice?: number | string | null;
  lineTotal: number | string;
  descriptionAr?: string | null;
  descriptionEn?: string | null;
  term?: { nameAr: string; nameEn?: string | null } | null;
}

export interface QuotationPdfCondition {
  order: number;
  titleAr?: string | null;
  titleEn?: string | null;
  bodyAr: string;
  bodyEn?: string | null;
}

export interface QuotationPdfData {
  quotationNumber: string;
  date: string; // ISO
  supervisionPercent: number | string;
  subtotal: number | string;
  supervisionAmount: number | string;
  grandTotal: number | string;
  subject?: string | null;
  notes?: string | null;
  project: {
    name: string;
    location?: string | null;
    unitType?: string | null;
    client?: { name: string } | null;
  };
  lines: QuotationPdfLine[];
  conditions: QuotationPdfCondition[];
  locale?: 'ar' | 'en';
}

export async function exportQuotationPdf(data: QuotationPdfData): Promise<void> {
  if (typeof window === 'undefined') return;
  const fonts = await loadFonts();
  await printDocument(buildQuotationHtml(data, fonts));
}
