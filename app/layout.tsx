import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AetherCRM',
  description: 'CRM для проектных заказов',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}