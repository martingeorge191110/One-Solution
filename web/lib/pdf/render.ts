/**
 * Shared PDF rendering for ONE SOLUTIONS documents.
 *
 * Documents are produced by writing a fully-styled, self-contained HTML page
 * (Arabic font embedded as base64) into a hidden iframe and invoking the
 * browser's native print engine. The browser shapes Arabic perfectly and the
 * output matches the on-screen design exactly — far higher fidelity than
 * canvas rasterisation. The user picks "Save as PDF" in the print dialog.
 */

export interface EmbeddedFonts {
  reg: string;
  bold: string;
  /** Company logo as a ready-to-use data URL (data:image/...;base64,...). */
  logo: string;
}

let cachedFonts: EmbeddedFonts | null = null;

async function fetchBase64(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  let binary = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

/** Loads + caches the Amiri font + company logo as base64 for embedding. */
export async function loadFonts(): Promise<EmbeddedFonts> {
  if (cachedFonts) return cachedFonts;
  const [reg, bold, logo] = await Promise.all([
    fetchBase64('/fonts/Amiri-Regular.ttf'),
    fetchBase64('/fonts/Amiri-Bold.ttf'),
    fetchBase64('/logo.jpeg').then((b) => `data:image/jpeg;base64,${b}`).catch(() => ''),
  ]);
  cachedFonts = { reg, bold, logo };
  return cachedFonts;
}

/** Renders a complete HTML document in a hidden iframe and opens the print dialog. */
export async function printDocument(html: string): Promise<void> {
  if (typeof window === 'undefined') return;

  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText =
    'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';
  document.body.appendChild(iframe);

  const win = iframe.contentWindow;
  if (!win) {
    iframe.remove();
    return;
  }

  await new Promise<void>((resolve) => {
    iframe.addEventListener('load', () => resolve(), { once: true });
    const doc = win.document;
    doc.open();
    doc.write(html);
    doc.close();
  });

  // Ensure the embedded font is fully ready before printing.
  try {
    await win.document.fonts.ready;
  } catch {
    /* best effort */
  }

  // Clean up after the print dialog closes.
  const cleanup = () => setTimeout(() => iframe.remove(), 500);
  win.addEventListener('afterprint', cleanup, { once: true });
  setTimeout(cleanup, 60000); // safety net

  win.focus();
  win.print();
}
