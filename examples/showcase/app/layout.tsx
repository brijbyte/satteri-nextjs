import type { ReactNode } from 'react';
import './globals.css';

export const metadata = {
  title: 'satteri-nextjs showcase',
  description: 'Demonstrates each milestone of the satteri Next.js integration.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <a href="/" className="brand">
            satteri-nextjs
          </a>
          <span className="tag">showcase</span>
        </header>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
