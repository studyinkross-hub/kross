import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'KROSS THE MASTER · Học cùng nhau',
  description:
    'KROSS THE MASTER 한국어 온라인 영상 수업. 과정별 영상과 학생별 학습 진도를 한곳에서 확인하세요.',
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800&family=Noto+Sans+KR:wght@400;500;600;700&family=Patrick+Hand&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
