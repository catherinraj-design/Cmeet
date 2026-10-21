import type { Metadata } from "next";
import "@livekit/components-styles";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cmeet - Google Meet for School ERP",
  description: "Secure, Google Meet–like classroom video conferencing for School ERP",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#202124] text-[#e8eaed] antialiased selection:bg-[#1a73e8] selection:text-white">
        <main className="min-h-screen">{children}</main>
      </body>
    </html>
  );
}
