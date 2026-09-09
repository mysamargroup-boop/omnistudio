import type { Metadata } from "next";
import { Outfit, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import SmoothScroll from "@/components/SmoothScroll";
import { ThemeProvider } from "@/components/ThemeProvider";
import PageTransition from "@/components/PageTransition";
import { AuthProvider } from "@/context/AuthContext";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "OmniStudio AI — High-End Generative Creative Suite",
  description: "Autonomous AI Video, Visual Diffusion, and Neural Voiceover Workstation",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${plusJakarta.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body className="antialiased bg-[#f8f9fa] dark:bg-[#030304] text-zinc-900 dark:text-white selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black overflow-x-hidden w-full">
        <ThemeProvider>
          <AuthProvider>
            <SmoothScroll>
              <Sidebar />
              <div className="lg:ml-64 ml-0 min-h-screen flex flex-col bg-[#f8f9fa] dark:bg-[#030304] text-zinc-900 dark:text-white transition-colors duration-200 max-w-full overflow-x-hidden">
                <Header />
                <main className="flex-1 px-4 sm:px-8 py-4 max-w-7xl mx-auto w-full overflow-x-hidden">
                  <PageTransition>{children}</PageTransition>
                </main>
              </div>
            </SmoothScroll>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
