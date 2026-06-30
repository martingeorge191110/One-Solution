/**
 * Final Invoice PDF — rendered via the browser print engine (perfect Arabic,
 * professional design). NO created-by / user identity anywhere.
 * See lib/pdf/templates.ts and lib/pdf/render.ts.
 */
import type { FinalInvoiceResponse } from '@/lib/api/reports.api';
import { loadFonts, printDocument } from '@/lib/pdf/render';
import { buildFinalInvoiceHtml } from '@/lib/pdf/templates';

export async function exportFinalInvoicePdf(data: FinalInvoiceResponse): Promise<void> {
  if (typeof window === 'undefined') return;
  const fonts = await loadFonts();
  await printDocument(buildFinalInvoiceHtml(data, fonts));
}
