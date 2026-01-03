import type { Metadata, Viewport } from "next"; // Importe Viewport
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });

// 1. Configuração de Viewport separada (Padrão Next.js 16)
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // Impede zoom de pinça (sensação de app)
  themeColor: "#130b20",
};

// 2. Metadata (Título e SEO)
export const metadata: Metadata = {
  title: "FinLove",
  description: "Gerencie suas finanças com amor.",
  manifest: "/manifest.json",
  icons: {
    apple: "/icon-192.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.className} bg-[#130b20] text-gray-100`}>
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}