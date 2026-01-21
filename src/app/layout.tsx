// Fix: Use named type import to resolve resolution error for Metadata
import { type Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "NetShop Partner Management System",
  description: "A comprehensive B2B management platform for net shop co-operations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      </head>
      <body className="bg-slate-50 text-slate-900 transition-colors duration-200">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}