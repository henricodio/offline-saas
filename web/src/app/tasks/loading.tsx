export default function LoadingTasks() {
  return (
    <main className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="animate-pulse space-y-4">
        <div className="h-6 w-48 bg-[var(--muted)] rounded" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
            <div className="h-8 w-40 bg-[var(--muted)] rounded" />
            <div className="h-64 w-full bg-[var(--muted)] rounded" />
          </div>
          <div className="space-y-3">
            <div className="h-6 w-32 bg-[var(--muted)] rounded" />
            <div className="h-40 w-full bg-[var(--muted)] rounded" />
            <div className="h-40 w-full bg-[var(--muted)] rounded" />
          </div>
        </div>
      </div>
    </main>
  );
}
