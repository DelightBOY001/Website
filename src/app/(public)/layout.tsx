import type { ReactNode } from 'react';
import { Providers } from '@/components/providers';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <Providers>
      <Navbar />
      <main className="min-h-screen pt-16">{children}</main>
      <Footer />
    </Providers>
  );
}
