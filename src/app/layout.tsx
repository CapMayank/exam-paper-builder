import type { Metadata, Viewport } from "next";
import { Edu_NSW_ACT_Foundation, Figtree, Literata, Noto_Sans, Noto_Sans_Devanagari } from "next/font/google";
import "katex/dist/katex.min.css";
import "./globals.css";

// UI: Figtree (friendly, very legible at small sizes). Headings: Literata, a book serif,
// which fits a tool whose output is a printed textbook-style paper.
const ui = Figtree({ variable: "--font-ui", subsets: ["latin"] });
const heading = Literata({ variable: "--font-heading", subsets: ["latin"] });
// The printed paper keeps Noto Sans so print output is unchanged.
// Latin + Devanagari (Hindi/Marathi) are bundled; other scripts fall back to the system font.
const noto = Noto_Sans({ variable: "--font-noto", subsets: ["latin"] });
const deva = Noto_Sans_Devanagari({ variable: "--font-deva", subsets: ["devanagari"] });
// Pre-primary handwriting sheets: a school print-handwriting font whose capitals are twice its
// small letters, so it fills the evenly spaced 4-line ruling in FourLineGuide. Keep the two together.
const kid = Edu_NSW_ACT_Foundation({ variable: "--font-kid", subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "Sarvodaya Higher Secondary School, Lakhnadon · Examination Portal",
    template: "%s · Sarvodaya H.S. School, Lakhnadon",
  },
  description:
    "Official Examination & Question Paper Governance System of Sarvodaya Higher Secondary School, Lakhnadon (Est. 2002 · तमसो माँ ज्योतिर्गमय).",
  icons: {
    icon: "/school-logo.png",
    apple: "/school-logo.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b2540",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${ui.variable} ${heading.variable} ${noto.variable} ${deva.variable} ${kid.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
