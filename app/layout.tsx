import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { NavHeader } from "@/components/nav-header";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Survivor Stock Exchange",
  description: "Buy and trade stocks of Survivor contestants. The player with the most stock of the winning contestant wins.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased min-h-screen bg-background`}>
        <Providers>
          <NavHeader />
          <main className="min-h-[calc(100vh-4rem)]">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
