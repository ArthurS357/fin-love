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

// OTIMIZAÇÃO: Metadados completos para SEO e Redes Sociais
export const metadata: Metadata = {
  title: {
    template: '%s | FinLove',
    default: 'FinLove - Finanças para Casais',
  },
  description: "Gerencie suas finanças, defina metas e realize sonhos a dois.",
  manifest: "/manifest.json",
  icons: {
    apple: "/icon-192.png",
    icon: "/favicon-32x32.png", // Garante fallback
  },
  // Configuração para compartilhamento (WhatsApp, Twitter, etc)
  openGraph: {
    title: "FinLove - Finanças Compartilhadas",
    description: "A melhor forma de organizar o dinheiro do casal.",
    url: "https://finlove.vercel.app", // Coloque sua URL real aqui
    siteName: "FinLove",
    locale: "pt_BR",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
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
        
        {/* Componentes de Monitoramento da Vercel (Não afetam performance visual) */}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}