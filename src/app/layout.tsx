
import type { Metadata } from "next";
import { Comfortaa, Outfit } from "next/font/google";
import "./globals.css";
import clsx from "clsx";
import { LanguageProvider } from "@/context/LanguageContext";
import { ThemeProvider } from "@/context/ThemeContext";

const comfortaa = Comfortaa({
  subsets: ["latin"],
  variable: "--font-comfortaa",
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
          comfortaa.variable,
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
