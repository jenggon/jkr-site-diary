import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/context/AuthContext";
import "./globals.css";
import "./ngamsoi.css";
import "./ngamsoi-n03.css";
import "./ngamsoi-n04.css";
import "./ngamsoi-n05.css";
import "./ngamsoi-n05r.css";
import "./ngamsoi-n05r-spine.css";
import "./ngamsoi-n04r.css";
import "./ngamsoi-n05r2-type.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NGAMSOI | JKR Site Diary",
  description: "NGAMSOI buku tapak digital JKR",
  icons: {
    icon: "/ngamsoi-mark.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ms"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
