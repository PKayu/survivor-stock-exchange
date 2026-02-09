import type { Metadata } from "next";
import { Bebas_Neue, Oswald, Open_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { NavHeader } from "@/components/nav-header";

const bebasNeue = Bebas_Neue({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400"],
});

const oswald = Oswald({
  subsets: ["latin"],
  variable: "--font-heading",
  weight: ["400", "500", "600", "700"],
});

const openSans = Open_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Survivor Stock Exchange - Outwit. Outplay. Out-invest.",
  description: "Trade stocks of your favorite Survivor contestants. Build your portfolio. Outwit. Outplay. Out-invest.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${bebasNeue.variable} ${oswald.variable} ${openSans.variable} font-body antialiased min-h-screen bg-background`}>
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
