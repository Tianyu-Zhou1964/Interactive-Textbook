import type { Metadata } from "next";
import "./globals.css";
// Import KaTeX CSS globally for math rendering
import 'katex/dist/katex.min.css';
// Providers (Client Components)
import { Providers } from '@/components/Providers';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';

export const metadata: Metadata = {
  title: "PassionIsEverything - 《手撕 AI 大模型》互动教程",
  description: "由“阡陌交通_”创作的 AI 大模型深度解析互动教程，结合代码执行与 AI 助教，带你从零理解大模型本质。",
  keywords: ["AI 大模型", "Transformer", "深度学习", "互动教程", "手撕大模型"],
  openGraph: {
    title: "PassionIsEverything - 《手撕 AI 大模型》互动教程",
    description: "由“阡陌交通_”创作的 AI 大模型深度解析互动教程，结合代码执行与 AI 助教。",
    url: "https://passionie.uk",
    siteName: "PassionIsEverything",
    locale: "zh_CN",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        {/* 这里可以放置 Umami 或 Google Analytics 脚本 */}
        {process.env.NEXT_PUBLIC_UMAMI_ID && (
          <script
            async
            defer
            src="https://cloud.umami.is/script.js"
            data-website-id={process.env.NEXT_PUBLIC_UMAMI_ID}
          ></script>
        )}
      </head>
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}
      >
        <LanguageProvider>
          <Providers>
            {children}
          </Providers>
        </LanguageProvider>
      </body>
    </html>
  );
}
