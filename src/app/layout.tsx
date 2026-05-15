
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
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0",
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
