import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { I18nProvider } from "@/components/i18n-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'),
  title: "iSelfToken",
  description: "Invista em startups promissoras via tokenização de equity",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/icon600x600.png",
  },
  openGraph: {
    title: 'iSelfToken',
    description: 'Invista em startups promissoras via tokenização de equity',
    images: [
      {
        url: '/iSelfToken.svg', // caminho da imagem
        width: 1200,
        height: 630,
        alt: 'iSelfToken',
      }
    ],
    siteName: 'iSelfToken',
    locale: 'pt-BR',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <I18nProvider>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            {children}
            <Toaster />
          </ThemeProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
