import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { ToastProvider } from "@/components/ui/Toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "ESP32 Control",
  description: "ควบคุมรีเลย์และไฟ LED ของ ESP32 ผ่าน MQTT",
};

export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="th">
      <body className="min-h-dvh bg-canvas text-white antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
