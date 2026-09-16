import type { Metadata, Viewport } from "next";
import { Space_Grotesk, JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space",
  subsets: ["latin"],
  weight: ["500", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#CCFF00",
};

export const metadata: Metadata = {
  title: "Seekr",
  description: "Social party game. Scan, answer questions, find your target in the room.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} ${plusJakarta.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col selection:bg-[#CCFF00] selection:text-[#121212] bg-[#F4F1EA] text-[#121212]">
        {children}
        <Toaster
          richColors
          position="bottom-right"
          toastOptions={{
            duration: 4000,
            style: {
              border: '3px solid #121212',
              boxShadow: '4px 4px 0 #121212',
              fontFamily: 'var(--font-mono), monospace',
              fontWeight: '600',
            },
            classNames: {
              toast: 'font-mono-tactical',
              title: 'font-bold',
            }
          }}
        />
      </body>
    </html>
  );
}
