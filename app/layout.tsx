import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'KROSS Campus · Học cùng nhau',
  description:
    '한국어 영상 수업과 미션, 단어 복습, 선생님 피드백을 연결하는 KROSS Campus.',
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
