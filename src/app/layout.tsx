
import type { Metadata } from "next";
import { Playfair_Display, Cormorant_Garamond, Outfit } from "next/font/google";
import "./globals.css";
import clsx from "clsx";
import { LanguageProvider } from "@/context/LanguageContext";
import { ThemeProvider } from "@/context/ThemeContext";

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const cormorantGaramond = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-cormorant",
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Glowbook | Premium Booking Made Simple",
  description: "Booking made easier. A premium experience for providers and customers.",
  icons: {
    icon: '/icon.png',
    shortcut: '/icon.png',
    apple: '/apple-icon.png',
  },
  appleWebApp: {
    capable: true,
    title: "Glowbook",
    statusBarStyle: "default",
  },
  openGraph: {
    title: "Glowbook | Premium Booking Made Simple",
    description: "Booking made easier. A premium experience for providers and customers.",
    url: "https://glowbook.se",
    siteName: "Glowbook",
    images: [
      {
        url: "https://glowbook.se/glowbook_og_banner.png",
        width: 1200,
        height: 630,
        alt: "Glowbook",
      },
    ],
    locale: "sv-SE",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Glowbook | Premium Booking Made Simple",
    description: "Booking made easier. A premium experience for providers and customers.",
    images: ["https://glowbook.se/glowbook_og_banner.png"],
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0a0a0a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sv">
      <body
        className={clsx(
          playfairDisplay.variable,
          cormorantGaramond.variable,
          outfit.variable,
          "antialiased bg-background text-foreground font-body transition-colors duration-300"
        )}
      >
        <ThemeProvider>
          <LanguageProvider>
            {children}
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
