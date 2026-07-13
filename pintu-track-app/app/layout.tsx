import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppDataProvider } from "@/lib/store";
import AppNav from "@/components/AppNav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PintuTrack",
  description:
    "Catat pengeluaran harianmu secepat kirim chat — pantau anggaran dan lihat ke mana uangmu pergi.",
};

export const viewport: Viewport = {
  themeColor: "#07090f",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <AppDataProvider>
          <AppNav />
          <main className="mx-auto w-full max-w-3xl px-4 pb-28 pt-6 md:pb-12 md:pt-24">
            {children}
          </main>
        </AppDataProvider>
      </body>
    </html>
  );
}
