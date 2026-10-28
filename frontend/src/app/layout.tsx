import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BrandProof // Evidence-Aware Brand Governance — Inkloom AI",
  description:
    "Review marketing content against brand policies, identify unsupported claims, improve risky language, and preserve accountable human decisions.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased scroll-smooth">
      <body className="min-h-full flex flex-col bg-[#07110D] text-[#F4F1E8]">
        {children}
      </body>
    </html>
  );
}
