import type { Metadata } from "next";
import { Noto_Sans_JP, Noto_Serif_JP, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/contexts/AppContext";
import { RecordsProvider } from "@/contexts/RecordsContext";
import OfflineBanner from "@/components/layout/OfflineBanner";
import BottomNav from "@/components/layout/BottomNav";

const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
  variable: "--font-noto-sans-jp",
});

const notoSerifJP = Noto_Serif_JP({
  subsets: ["latin"],
  weight: ["500", "700"],
  display: "swap",
  variable: "--font-noto-serif-jp",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["italic", "normal"],
  display: "swap",
  variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: "MycoNote - キノコ採取・観察ハンドブック",
  description: "きのこフィールドガイド PWA",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const fontVars = `${notoSansJP.variable} ${notoSerifJP.variable} ${inter.variable} ${jetbrainsMono.variable}`;

  return (
    <html lang="ja" className={`h-full ${fontVars}`}>
      <body className="min-h-full flex flex-col">
        <AppProvider>
          <RecordsProvider>
            <OfflineBanner />
            <main className="max-w-lg mx-auto w-full flex-1 pb-16">
              {children}
            </main>
            <BottomNav />
          </RecordsProvider>
        </AppProvider>
      </body>
    </html>
  );
}
