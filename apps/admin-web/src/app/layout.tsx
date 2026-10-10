import type { Metadata } from "next";
import "@livekit/components-styles";
import "./globals.css";

export const metadata: Metadata = {
  title: "School ERP - Video Conferencing (Cmeet)",
  description: "Secure, Google Meet–like classroom video conferencing for School ERP",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-zinc-950 text-zinc-100 antialiased">
        <header className="h-16 border-b border-zinc-800/80 bg-zinc-900/50 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-50">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-md shadow-indigo-600/30">
              C
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-sm tracking-tight text-white">Cmeet Classroom</span>
              <span className="text-[10px] text-zinc-400">School ERP Live Conferencing</span>
            </div>
          </div>
          <div className="flex items-center space-x-4 text-xs text-zinc-400">
            <a
              href="/meetings"
              className="px-3 py-1.5 rounded-lg hover:text-white hover:bg-zinc-800 transition"
            >
              Classes & Meetings
            </a>
            <a
              href="/meetings/schedule"
              className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-500 transition shadow-sm"
            >
              + Schedule Class
            </a>
          </div>
        </header>
        <main className="min-h-[calc(100vh-4rem)]">{children}</main>
      </body>
    </html>
  );
}
