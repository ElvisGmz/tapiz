import type { Metadata } from "next";
import { uiFontClass } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tapiz",
  // Not public yet: no description/OG tags, and tell crawlers not to index or follow anything.
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className={`${uiFontClass} h-full`}>{children}</body>
    </html>
  );
}
