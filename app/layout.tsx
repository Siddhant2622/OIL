import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "SIF Sentinel — AI-Powered Safety Precursor Detection",
    template: "%s | SIF Sentinel",
  },
  description:
    "SIF Sentinel detects Serious Injury & Fatality precursors in Unsafe-Act, Unsafe-Condition, Near-Miss and Incident reports using Google Gemini AI. Built for Oil & Gas and industrial safety teams.",
  keywords: [
    "SIF",
    "safety",
    "precursor detection",
    "AI",
    "HSE",
    "HSSE",
    "near miss",
    "unsafe act",
    "Oil India",
    "industrial safety",
    "NLP",
  ],
  authors: [{ name: "SIF Sentinel" }],
  robots: "index, follow",
  openGraph: {
    type: "website",
    locale: "en_IN",
    title: "SIF Sentinel — AI-Powered Safety Precursor Detection",
    description:
      "Detect fatal-potential safety events before they become tragedies.",
    siteName: "SIF Sentinel",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
