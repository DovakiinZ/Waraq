import { ReactNode } from 'react';
import Header from './Header';
import Footer from './Footer';
import { A } from '@/components/arcade/theme';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    // 100dvh rather than 100vh: on iOS Safari the collapsing address bar makes
    // vh units jump, which shifts the footer as the user scrolls.
    <div
      className="flex min-h-[100dvh] flex-col font-arabic"
      style={{ background: A.bg, color: A.ink }}
    >
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
};

export default Layout;
