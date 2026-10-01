import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'NEXUS ARENA — Compete. Conquer. Dominate.',
    template: '%s · NEXUS ARENA',
  },
  description:
    'NEXUS ARENA is a premium esports tournament platform — discover tournaments, pay entry fees securely with UPI, track live brackets, climb the leaderboard and win prizes.',
  keywords: [
    'esports',
    'tournament',
    'gaming',
    'bracket',
    'BGMI',
    'Valorant',
    'Free Fire',
    'esports india',
    'tournament platform',
  ],
  openGraph: {
    title: 'NEXUS ARENA — Professional Esports Tournaments',
    description: 'Join competitive gaming tournaments. Real brackets. Real prizes. Real glory.',
    type: 'website',
    siteName: 'NEXUS ARENA',
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#05060f',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" data-scroll-behavior="smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Premium esports type: Orbitron (display) + Inter (body) — degrade gracefully offline */}
        <link
          href="https://fonts.googleapis.com/css2?family=Orbitron:wght@500;600;700;800;900&family=Inter:wght@300;400;500;600;700;800&family=Rajdhani:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
