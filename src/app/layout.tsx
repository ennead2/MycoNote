import type { Metadata } from "next";
import "./globals.css";
import { AppProvider } from "@/contexts/AppContext";
import OfflineBanner from "@/components/layout/OfflineBanner";
import BottomNav from "@/components/layout/BottomNav";

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
  return (
    <html lang="ja" className="h-full">
      <body className="min-h-full flex flex-col">
        <AppProvider>
          <OfflineBanner />
          <main className="max-w-lg mx-auto w-full flex-1 pb-16">
            {children}
          </main>
          <BottomNav />
        </AppProvider>
      </body>
    </html>
  );
}
