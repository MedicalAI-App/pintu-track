import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PintuTrack — Catat Pengeluaran Secepat Kirim Chat",
  description:
    "Expense tracker harian paling praktis: catat lewat web atau chat bot Telegram, kategori otomatis, anggaran terpantau, dan tersinkron ke Google Sheets.",
  keywords: [
    "expense tracker",
    "catat pengeluaran",
    "bot telegram keuangan",
    "aplikasi keuangan",
    "google sheets",
  ],
  openGraph: {
    title: "PintuTrack — Catat Pengeluaran Secepat Kirim Chat",
    description:
      "Cukup ketik 'Makan siang 30rb' ke bot Telegram. Tercatat otomatis, tersinkron ke Google Sheets.",
    locale: "id_ID",
    type: "website",
  },
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
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
