import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FieldFlow",
  description: "WhatsApp-native field service management",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
