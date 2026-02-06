import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Primordia | Ground Truth Intelligence",
  description: "Intelligence terminal analyzing satellite imagery, news sentiment, and market data to detect divergence signals before markets react.",
  keywords: ["satellite data", "market intelligence", "news sentiment", "divergence analysis", "alternative data"],
  authors: [{ name: "Primordia" }],
  openGraph: {
    title: "Primordia | Ground Truth Intelligence",
    description: "Satellite vs News divergence analysis. See what headlines miss.",
    url: "https://primordialabs.io",
    siteName: "Primordia",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Primordia | Ground Truth Intelligence",
    description: "Satellite vs News divergence analysis. See what headlines miss.",
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://api.mapbox.com/mapbox-gl-js/v3.1.2/mapbox-gl.css"
          rel="stylesheet"
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Audiowide&family=Space+Grotesk:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
