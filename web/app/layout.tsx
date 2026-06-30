import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ONE SOLUTIONS",
  description: "Finishing & supervision operations for residential units.",
};

// Root layout — locale-specific layout is in app/[locale]/layout.tsx
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
