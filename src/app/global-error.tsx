'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ background: '#0b121d', color: '#e2e8f0', fontFamily: 'system-ui' }}>
        <main
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
          }}
        >
          <p style={{ fontSize: 56, fontWeight: 900, color: '#62dce7' }}>ERROR</p>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Something went wrong</h1>
          <p style={{ color: '#94a3b8', maxWidth: 420, textAlign: 'center' }}>
            An unexpected error occurred. Your data is safe — try again in a moment.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: 8,
              padding: '12px 28px',
              borderRadius: 12,
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              background: 'linear-gradient(90deg, #62dce7, #6b9fea)',
              color: '#0b121d',
            }}
          >
            TRY AGAIN
          </button>
        </main>
      </body>
    </html>
  );
}
