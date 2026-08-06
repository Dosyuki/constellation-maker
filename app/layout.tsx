import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "นักสร้างกลุ่มดาว — Constellation Maker",
  description: "Interactive web prototype for the Constellation Maker physical puzzle game.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="th"><body>{children}</body></html>;
}
