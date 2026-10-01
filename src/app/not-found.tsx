export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4">
      <p className="text-6xl font-black text-neon-cyan">404</p>
      <h1 className="text-2xl font-bold text-white">Page not found</h1>
      <a href="/" className="text-slate-400 underline hover:text-white">
        Back to home
      </a>
    </main>
  );
}
