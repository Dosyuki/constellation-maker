import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "นักสร้างกลุ่มดาว — Constellation Maker",
  description: "ทดลองเล่น Constellation Maker และสำรวจ UI Mockup กับ Game Flow ทีละขั้น",
  metadataBase: new URL("https://constellation-maker-th.ndf-ai.chatgpt.site"),
  openGraph: {
    title: "นักสร้างกลุ่มดาว — Constellation Maker",
    description: "เกมปริศนาแบบใช้ร่างกาย พร้อม UI Mockup และ Game Flow แบบ Interactive",
    images: [{ url: "/og.png", width: 1733, height: 909, alt: "ผู้เล่นร่วมกันสร้างกลุ่มดาวบนพื้น Interactive" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "นักสร้างกลุ่มดาว — Constellation Maker",
    description: "ทดลองเล่นและเปิดดูทุกขั้นตอนของ UI กับ Game Flow",
    images: ["/og.png"],
  },
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="th"><body>{children}</body></html>;
}
