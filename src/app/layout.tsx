import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Rotas Seguras - Plataforma de Resposta a Desastres",
  description: "Plataforma colaborativa em tempo real para rotas seguras e resposta a desastres naturais (alagamentos, enchentes, deslizamentos).",
  keywords: ["GIS", "Leaflet", "OpenStreetMap", "desastres", "alagamentos", "rotas seguras", "Defesa Civil", "PostGIS"],
  authors: [{ name: "Plataforma Rotas Seguras" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "Rotas Seguras",
    description: "Plataforma colaborativa de resposta a desastres",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
