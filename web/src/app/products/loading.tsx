export default function LoadingProducts() {
  return (
    <main className="max-w-5xl mx-auto p-6 space-y-5">
      <div className="animate-pulse space-y-4">
        <div className="h-6 w-40 bg-[var(--muted)] rounded" />
        <div className="h-10 w-full bg-[var(--muted)] rounded" />
        <div className="h-60 w-full bg-[var(--muted)] rounded" />
      </div>
    </main>
  );
}
