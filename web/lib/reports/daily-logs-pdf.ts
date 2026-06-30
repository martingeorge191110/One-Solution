/**
 * Daily Logs Report PDF — rendered via the browser print engine (perfect
 * Arabic, professional design). NO created-by / user identity anywhere.
 * See lib/pdf/templates.ts and lib/pdf/render.ts.
 */
import type { DailyLogsReportResponse } from '@/lib/api/reports.api';
import { loadFonts, printDocument } from '@/lib/pdf/render';
import { buildDailyLogsHtml } from '@/lib/pdf/templates';

export async function exportDailyLogsReportPdf(data: DailyLogsReportResponse): Promise<void> {
  if (typeof window === 'undefined') return;
  const fonts = await loadFonts();
  await printDocument(buildDailyLogsHtml(data, fonts));
}
