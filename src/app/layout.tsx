import type { Metadata, Viewport } from "next"; // Importe Viewport
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });

// OTIMIZAÇÃO: Configuração de Viewport separada (Padrão Next.js 16)
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // Impede zoom de pinça (sensação de app nativo)
  themeColor: "#130b20",
};

export const metadata: Metadata = {
  title: "FinLove",
  description: "Gerencie suas finanças com amor.",
  manifest: "/manifest.json", // Garante que o PWA seja detectado
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
      <body className={`${inter.className} bg-[#130b20] text-gray-100 antialiased`}>
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}