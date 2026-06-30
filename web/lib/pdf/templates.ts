/**
 * Shared professional design system for all ONE SOLUTIONS documents
 * (quotation, daily-logs report, final invoice). Color theory: neutral ink
 * + grays, ONE restrained gold accent (#B8924A), generous whitespace, minimal
 * borders. Rendered via the browser print engine (see lib/pdf/render.ts).
 */
import type { EmbeddedFonts } from './render';

const money = (v: unknown) =>
  new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 }).format(Number(v) || 0) + ' ج';
const qty = (v: unknown) => (v == null ? '—' : Number(v).toLocaleString('de-DE'));
const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string));
const arDate = (iso: unknown) => {
  const d = new Date(iso as string);
  return isNaN(d.getTime())
    ? esc(iso)
    : d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
};

const baseCss = (fonts: EmbeddedFonts) => `
@font-face{font-family:'Amiri';font-weight:400;src:url(data:font/ttf;base64,${fonts.reg}) format('truetype');}
@font-face{font-family:'Amiri';font-weight:700;src:url(data:font/ttf;base64,${fonts.bold}) format('truetype');}
*{margin:0;padding:0;box-sizing:border-box;}
@page{size:A4;margin:0;}
html,body{background:#fff;}
body{font-family:'Amiri',serif;color:#1f2430;direction:rtl;-webkit-font-smoothing:antialiased;}
.page{width:794px;min-height:1123px;padding:46px 48px 40px;margin:0 auto;background:#fff;position:relative;}

.head{display:flex;justify-content:space-between;align-items:flex-start;}
.brand .logo{height:66px;width:auto;display:block;}
.brand .one{font-size:34px;font-weight:700;color:#B8924A;letter-spacing:1px;line-height:1;}
.brand .sol{font-size:10px;letter-spacing:7px;color:#9aa0aa;margin-top:3px;}
.doc{text-align:left;}
.doc .t{font-size:25px;font-weight:700;color:#1b1f27;letter-spacing:.5px;}
.doc .d{font-size:12px;color:#6b7280;margin-top:6px;line-height:1.7;}
.doc .d b{color:#374151;font-weight:700;}
.rule{height:2px;background:#B8924A;margin:16px 0 22px;border-radius:2px;}

.meta{display:grid;grid-template-columns:1fr 1fr;gap:10px 32px;background:#fafafa;border:1px solid #ececec;border-radius:10px;padding:18px 22px;margin-bottom:22px;}
.meta .m{display:flex;flex-direction:column;gap:3px;}
.meta .m span{font-size:11px;color:#9097a1;}
.meta .m b{font-size:13.5px;color:#272c36;font-weight:700;}

.greet{font-size:13px;color:#4b5563;margin-bottom:16px;line-height:1.8;}

table{width:100%;border-collapse:collapse;}
thead th{font-size:11.5px;font-weight:700;color:#8a909b;padding:0 12px 9px;border-bottom:2px solid #1b1f27;text-align:center;}
thead th.bandh{text-align:right;}
tbody td{font-size:12.5px;padding:10px 12px;border-bottom:1px solid #f0f0f0;color:#3b414c;vertical-align:middle;}
tbody td.c{text-align:center;}
tbody td.band{text-align:right;color:#1f2430;line-height:1.7;}
tbody td.num{color:#a4a9b3;font-size:11.5px;}
tbody td.tot{font-weight:700;color:#1b1f27;white-space:nowrap;}
tbody td.lump{color:#a07c2c;font-style:italic;}
tbody tr:nth-child(even) td{background:#fcfcfb;}
tr{page-break-inside:avoid;}

.totwrap{display:flex;justify-content:flex-start;margin-top:20px;}
.totals{width:340px;}
.totals .r{display:flex;justify-content:space-between;align-items:center;padding:8px 2px;font-size:13px;}
.totals .r span{color:#6b7280;}
.totals .r b{color:#272c36;font-weight:700;}
.totals .grand{margin-top:6px;padding-top:12px;border-top:2px solid #1b1f27;display:flex;justify-content:space-between;align-items:center;}
.totals .grand span{font-size:14px;font-weight:700;color:#1b1f27;}
.totals .grand b{font-size:18px;font-weight:700;color:#B8924A;}

.block{margin-top:26px;page-break-inside:avoid;}
.block h2{display:flex;align-items:center;gap:9px;font-size:14.5px;font-weight:700;color:#1b1f27;margin-bottom:11px;}
.block h2 .bar{width:4px;height:18px;background:#B8924A;border-radius:2px;}
.conds{list-style:none;}
.conds li{position:relative;font-size:12.5px;color:#4b5563;line-height:1.95;padding:3px 18px 3px 0;}
.conds li:before{content:'•';position:absolute;right:2px;color:#B8924A;}
.conds li b{color:#272c36;}
.notes{font-size:12.5px;color:#4b5563;line-height:1.95;}

.section-title{display:flex;align-items:center;gap:9px;font-size:14px;font-weight:700;color:#1b1f27;margin:22px 0 9px;}
.section-title .bar{width:4px;height:17px;background:#B8924A;border-radius:2px;}
.subtotal-row td{font-weight:700;color:#1b1f27;background:#faf7f0 !important;border-bottom:2px solid #e7ddc7;}

.foot{margin-top:34px;padding-top:12px;border-top:1px solid #ececec;display:flex;justify-content:space-between;font-size:10px;color:#a4a9b3;letter-spacing:.5px;}
`;

const headerBlock = (logo: string, title: string, metaRight: string) => `
  <div class="head">
    <div class="brand">${
      logo
        ? `<img class="logo" src="${logo}" alt="ONE SOLUTIONS"/>`
        : `<div class="one">ONE</div><div class="sol">S O L U T I O N S</div>`
    }</div>
    <div class="doc"><div class="t">${title}</div><div class="d">${metaRight}</div></div>
  </div>
  <div class="rule"></div>`;

const metaCard = (rows: [string, unknown][]) =>
  `<div class="meta">${rows
    .filter((r) => r[1])
    .map((r) => `<div class="m"><span>${r[0]}</span><b>${esc(r[1])}</b></div>`)
    .join('')}</div>`;

const footer = `<div class="foot"><span>ONE SOLUTIONS — أعمال التشطيبات والإشراف</span><span>شكراً لتعاملكم معنا</span></div>`;

const docHtml = (fonts: EmbeddedFonts, title: string, inner: string) =>
  `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>${esc(title)}</title><style>${baseCss(fonts)}</style></head><body><div class="page">${inner}</div></body></html>`;

/* ─────────────────────────── QUOTATION ─────────────────────────── */
export function buildQuotationHtml(data: any, fonts: EmbeddedFonts): string {
  const S = Number(data.supervisionPercent) || 0;
  const lines = [...(data.lines || [])].sort((a, b) => a.order - b.order);
  const conds = [...(data.conditions || [])].sort((a, b) => a.order - b.order);
  const rows = lines
    .map((l: any, i: number) => {
      const d = l.descriptionAr || l.term?.nameAr || l.descriptionEn || l.term?.nameEn || '';
      return l.pricingMode === 'LUMP_SUM'
        ? `<tr><td class="c num">${i + 1}</td><td class="band">${esc(d)}</td><td class="c lump" colspan="3">مقطوعة</td><td class="c tot">${money(l.lineTotal)}</td></tr>`
        : `<tr><td class="c num">${i + 1}</td><td class="band">${esc(d)}</td><td class="c">${esc(l.unit || '—')}</td><td class="c">${qty(l.quantity)}</td><td class="c">${money(l.unitPrice ?? 0)}</td><td class="c tot">${money(l.lineTotal)}</td></tr>`;
    })
    .join('');
  const inner = `
  ${headerBlock(fonts.logo, 'عرض سعر', `<div>رقم العرض: <b>${esc(data.quotationNumber)}</b></div><div>التاريخ: <b>${arDate(data.date)}</b></div>`)}
  ${metaCard([['المشروع', data.project?.name], ['العميل', data.project?.client?.name], ['الموقع', data.project?.location], ['نوع الوحدة', data.project?.unitType], ['الموضوع', data.subject || 'أعمال تشطيب الوحدة السكنية']])}
  <div class="greet">تحية طيبة وبعد،،، نتقدم لسيادتكم بعرض الأسعار التالي لأعمال التشطيبات الخاصة بالوحدة.</div>
  <table><thead><tr><th style="width:34px">#</th><th class="bandh">البند</th><th style="width:64px">الوحدة</th><th style="width:60px">الكمية</th><th style="width:96px">سعر الوحدة</th><th style="width:108px">الإجمالي</th></tr></thead><tbody>${rows}</tbody></table>
  <div class="totwrap"><div class="totals">
    <div class="r"><span>الإجمالي</span><b>${money(data.subtotal)}</b></div>
    <div class="r"><span>نسبة الإشراف (${S}%)</span><b>${money(data.supervisionAmount)}</b></div>
    <div class="grand"><span>الإجمالي النهائي</span><b>${money(data.grandTotal)}</b></div>
  </div></div>
  ${conds.length ? `<section class="block"><h2><span class="bar"></span>الشروط والأحكام</h2><ol class="conds">${conds.map((c: any) => `<li>${c.titleAr ? `<b>${esc(c.titleAr)}</b> ` : ''}${esc(c.bodyAr)}</li>`).join('')}</ol></section>` : ''}
  ${data.notes && String(data.notes).trim() ? `<section class="block"><h2><span class="bar"></span>ملاحظات</h2><p class="notes">${esc(data.notes)}</p></section>` : ''}
  ${footer}`;
  return docHtml(fonts, `عرض سعر - ${esc(data.project?.name || data.quotationNumber || '')}`, inner);
}

/* ─────────────────────────── DAILY LOGS REPORT ─────────────────────────── */
export function buildDailyLogsHtml(data: any, fonts: EmbeddedFonts): string {
  const h = data.header || {};
  const entries = data.entries || [];
  const t = data.totals || {};
  const range =
    h.from || h.to
      ? `<div>الفترة: <b>${h.from ? arDate(h.from) : '—'} — ${h.to ? arDate(h.to) : '—'}</b></div>`
      : '<div>كل الفترات</div>';
  const rows = entries
    .map((e: any, i: number) => {
      const name = e.isAdditional
        ? `${esc(e.additionalNameAr || '—')} <span style="font-size:10px;color:#a07c2c;border:1px solid #e7ddc7;border-radius:4px;padding:1px 5px;">إضافي</span>`
        : esc(e.itemNameAr || '—');
      return `<tr><td class="c num">${i + 1}</td><td class="c">${arDate(e.logDate)}</td><td class="band">${e.isAdditional ? '—' : esc(e.termNameAr || '—')}</td><td class="band">${name}</td><td class="c">${qty(e.quantity)}</td><td class="c">${esc(e.unit || '—')}</td><td class="c tot">${money(e.amount)}</td></tr>`;
    })
    .join('');
  const inner = `
  ${headerBlock(fonts.logo, 'تقرير اليوميات', range)}
  ${metaCard([['المشروع', h.project?.name], ['العميل', h.client?.name], ['الموقع', h.project?.location], ['نوع الوحدة', h.project?.unitType]])}
  <table><thead><tr><th style="width:30px">#</th><th style="width:92px">التاريخ</th><th class="bandh">البند</th><th class="bandh">العنصر</th><th style="width:54px">الكمية</th><th style="width:56px">الوحدة</th><th style="width:104px">المبلغ</th></tr></thead><tbody>${rows || '<tr><td class="c" colspan="7" style="color:#9097a1;padding:24px">لا توجد بيانات في هذه الفترة</td></tr>'}</tbody></table>
  <div class="totwrap"><div class="totals">
    <div class="r"><span>إجمالي البنود والعناصر</span><b>${money(t.termItemSpent)}</b></div>
    <div class="r"><span>إجمالي الإضافات</span><b>${money(t.additionalsSpent)}</b></div>
    <div class="grand"><span>الإجمالي المنصرف</span><b>${money(t.totalSpent)}</b></div>
  </div></div>
  ${footer}`;
  return docHtml(fonts, `تقرير يوميات - ${esc(h.project?.name || '')}`.trim().replace(/- $/, '').trim(), inner);
}

/* ─────────────────────────── FINAL INVOICE ─────────────────────────── */
export function buildFinalInvoiceHtml(data: any, fonts: EmbeddedFonts): string {
  const h = data.header || {};
  const S = Number(data.supervisionPercent) || 0;
  const termSections = (data.terms || [])
    .map((term: any) => {
      const rows = (term.items || [])
        .map(
          (it: any) =>
            `<tr><td class="band">${esc(it.itemNameAr || '—')}</td><td class="c">${qty(it.totalQuantity)}</td><td class="c tot">${money(it.totalAmount)}</td></tr>`
        )
        .join('');
      return `<div class="section-title"><span class="bar"></span>${esc(term.termNameAr || '—')}</div>
        <table><thead><tr><th class="bandh">العنصر</th><th style="width:120px">إجمالي الكمية</th><th style="width:150px">إجمالي المبلغ</th></tr></thead>
        <tbody>${rows}<tr class="subtotal-row"><td class="band">إجمالي البند</td><td class="c">—</td><td class="c">${money(term.termTotal)}</td></tr></tbody></table>`;
    })
    .join('');
  const additionals =
    (data.additionals || []).length > 0
      ? `<div class="section-title"><span class="bar"></span>أعمال إضافية</div>
         <table><thead><tr><th class="bandh">البند</th><th style="width:120px">إجمالي الكمية</th><th style="width:150px">إجمالي المبلغ</th></tr></thead>
         <tbody>${data.additionals.map((a: any) => `<tr><td class="band">${esc(a.nameAr || '—')}</td><td class="c">${qty(a.totalQuantity)}</td><td class="c tot">${money(a.totalAmount)}</td></tr>`).join('')}</tbody></table>`
      : '';
  const inner = `
  ${headerBlock(fonts.logo, 'الفاتورة النهائية', `<div>التاريخ: <b>${arDate(new Date().toISOString())}</b></div>`)}
  ${metaCard([['المشروع', h.project?.name], ['العميل', h.client?.name], ['الموقع', h.project?.location], ['نوع الوحدة', h.project?.unitType]])}
  ${termSections}
  ${additionals}
  <div class="totwrap"><div class="totals">
    <div class="r"><span>إجمالي المنصرف</span><b>${money(data.totalSpent)}</b></div>
    <div class="r"><span>نسبة الإشراف (${S}%)</span><b>${money(data.supervisionFee)}</b></div>
    <div class="grand"><span>الإجمالي النهائي للفاتورة</span><b>${money(data.invoiceTotal)}</b></div>
  </div></div>
  ${footer}`;
  return docHtml(fonts, `فاتورة - ${esc(h.project?.name || '')}`.trim().replace(/- $/, '').trim(), inner);
}
