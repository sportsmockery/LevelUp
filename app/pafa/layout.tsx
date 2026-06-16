import type { Metadata } from "next";
import { Bebas_Neue, Inter, JetBrains_Mono } from "next/font/google";
import "./pafa.css";

const display = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display-loaded",
  display: "swap",
});

const sans = Inter({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-sans-loaded",
  display: "swap",
});

const mono = JetBrains_Mono({
  weight: "500",
  subsets: ["latin"],
  variable: "--font-mono-loaded",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Palatine Panthers",
    template: "%s | Palatine Panthers",
  },
  description: "",
  metadataBase: new URL("https://www.palatinepanthers.com"),
};

export default function PafaRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`pafa-theme ${display.variable} ${sans.variable} ${mono.variable} min-h-screen bg-bg-base text-text-primary antialiased`}
    >
      {children}
    </div>
  );
}
