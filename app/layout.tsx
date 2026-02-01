import type { Metadata } from "next";
import { Noto_Sans_KR, Fira_Code } from "next/font/google";
import "./globals.css";

const notoSansKR = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
});

const firaCode = Fira_Code({
  variable: "--font-fira-code",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "AI 채점기",
  description: "교사를 위한 AI 자동 채점 서비스",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${notoSansKR.variable} ${firaCode.variable} antialiased bg-[#ECFEFF] text-[#164E63]`}
      >
        {children}
      </body>
    </html>
  );
}
