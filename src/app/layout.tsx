import type { Metadata, Viewport } from "next";
import { Noto_Sans_JP, Noto_Serif_JP, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/contexts/AppContext";
import { RecordsProvider } from "@/contexts/RecordsContext";
import { BookmarksProvider } from "@/contexts/BookmarksContext";
import OfflineBanner from "@/components/layout/OfflineBanner";
import BottomNav from "@/components/layout/BottomNav";
import { V2ReleaseBanner } from "@/components/layout/V2ReleaseBanner";

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

// NOTE: Icon <link> tags (favicon / apple-touch-icon) are generated automatically
// by Next.js 16 from `src/app/icon.png` and `src/app/apple-icon.png` (file-based
// convention). `public/favicon.ico` is served at /favicon.ico for legacy clients.
// Manifest PWA icons are declared in `public/manifest.json`.
export const metadata: Metadata = {
  title: "MycoNote — きのこ採取・観察ハンドブック",
  description: "日本の里山きのこを CC BY 出典付き・人間レビュー済みでまとめた図鑑。識別・採取記録・採取計画をオフラインで。現代の民藝図鑑。",
  manifest: "/manifest.json",
  applicationName: "MycoNote",
  appleWebApp: {
    capable: true,
    title: "MycoNote",
    statusBarStyle: "black-translucent",
  },
};

// Next.js 15+: themeColor is configured via the viewport export, not metadata.
export const viewport: Viewport = {
  themeColor: "#0F1410",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const fontVars = `${notoSansJP.variable} ${notoSerifJP.variable} ${inter.variable} ${jetbrainsMono.variable}`;

  return (
    // suppressHydrationWarning on html/body prevents false positives caused by
    // browser extensions (password managers, dark-mode, translators) that inject
    // attributes/styles on these elements between SSR and hydration. Only applies
    // to direct attributes of <html>/<body>, not children.
    <html lang="ja" className={`h-full ${fontVars}`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <AppProvider>
          <RecordsProvider>
            <BookmarksProvider>
              <OfflineBanner />
              <V2ReleaseBanner />
              <main className="max-w-lg mx-auto w-full flex-1 pb-16">
                {children}
              </main>
              <BottomNav />
            </BookmarksProvider>
          </RecordsProvider>
        </AppProvider>
      </body>
    </html>
  );
}
