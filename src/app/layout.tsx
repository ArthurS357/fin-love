import type { Metadata, Viewport } from "next"; // Importa Viewport
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FinLove",
  description: "Gerencie suas finanças com amor",
  manifest: "/manifest.webmanifest", // Link para o manifesto gerado
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "FinLove",
  },
};

export const viewport: Viewport = {
  themeColor: "#130b20",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#130b20] text-white`}
      >
        {children}
        <Toaster position="top-center" richColors theme="dark" />
      </body>
    </html>
  );
}