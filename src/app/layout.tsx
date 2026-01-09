import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#130b20",
};

export const metadata: Metadata = {
  // CORREÇÃO CRÍTICA: Define a base para URLs relativas (og:image, etc)
  metadataBase: new URL('https://finlove-one.vercel.app/'),

  title: {
    template: '%s | FinLove',
    default: 'FinLove - Finanças para Casais',
  },
  description: "Gerencie suas finanças, defina metas e realize sonhos a dois.",
  themeColor: '#130b20', // Cor da barra do navegador mobile
  manifest: "/manifest.json",
  icons: {
    apple: "/icon-192.png",
    icon: "/favicon-32x32.png",
  },
  openGraph: {
    title: "FinLove - Finanças Compartilhadas",
    description: "A melhor forma de organizar o dinheiro do casal.",
    url: "/", // Agora pode ser relativo graças ao metadataBase
    siteName: "FinLove",
    locale: "pt_BR",
    type: "website",
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'FinLove Dashboard' }] // Sugestão
  },
  robots: {
    index: true,
    follow: true,
  },
  // Otimização para "Instalar Aplicativo" no iOS
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "FinLove"
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.className} bg-[#130b20] text-gray-100 antialiased`}>
        {children}
        <Toaster richColors position="top-center" />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}