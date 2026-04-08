import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MycoNote",
  description: "きのこフィールドガイド PWA",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="h-full">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
