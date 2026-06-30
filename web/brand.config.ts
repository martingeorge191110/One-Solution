/**
 * ONE SOLUTIONS — brand single source of truth.
 * Colors here mirror the @theme tokens in app/globals.css (bronze-gold palette).
 */
export const brand = {
  name: "ONE SOLUTIONS",
  productName: "ONE SOLUTIONS",
  company: "ONE SOLUTIONS",
  tagline: "Finishing & supervision operations for residential units.",
  domain: "one-solutions.app",
  shortDescription:
    "Integrated finishing-operations management system for residential units — clients, projects, quotations, payments, and daily logs.",

  colors: {
    primary: "#B8924A",       // bronze-gold
    primaryDark: "#8C6D38",   // deep bronze
    accent: "#1A1A1A",        // near-black ink
    accentGrey: "#5A5A5A",    // mid grey
    success: "#16a34a",
    error: "#dc2626",
    warning: "#d97706",
    info: "#0891b2",
    surface: "#FAFAF8",       // neutral off-white
  },

  typography: {
    body: "Cairo",
    bodyVariable: "--font-cairo",
    latin: "Inter",
    latinVariable: "--font-inter",
  },

  meta: {
    defaultLocale: "ar_EG",
    supportedLocales: ["ar_EG", "en_US"],
    currency: "EGP",
    timezone: "Africa/Cairo",
    keywords: ["finishing operations", "residential", "one solutions", "quotations", "real estate"],
  },
} as const;
