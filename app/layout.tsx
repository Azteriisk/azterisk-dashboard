import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import { isLocalEnvironment } from "@/lib/catalog";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Azterisk Dashboard | dashboard.azterisk.net",
  description: "Workspace Projects, Dependency Radar & Compatibility Hub",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isLocal = isLocalEnvironment();

  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} min-h-screen bg-[#090d16] text-gray-100 antialiased selection:bg-blue-600 selection:text-white`}>
        <Header isLocal={isLocal} />
        <main className="max-w-7xl mx-auto px-6 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
