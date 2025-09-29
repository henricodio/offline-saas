export default function RootLoading() {
  return (
    <main className="max-w-5xl mx-auto p-6 space-y-6 animate-pulse">
      <div className="h-8 w-40 bg-gray-200 rounded" />
      <div className="text-xs text-[var(--muted-foreground)]">Cargando métricas del mes…</div>
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[0,1,2].map((i) => (
          <div key={i} className="card p-4 space-y-2">
            <div className="h-4 w-40 bg-gray-200 rounded" />
            <div className="h-6 w-24 bg-gray-200 rounded" />
            <div className="h-3 w-32 bg-gray-200 rounded" />
          </div>
        ))}
      </section>
      <section className="grid grid-cols-1 gap-4">
        <div className="card p-4 space-y-2">
          <div className="h-4 w-48 bg-gray-200 rounded" />
          <div className="space-y-2">
            {[...Array(5)].map((_, idx) => (
              <div key={idx} className="h-5 w-full bg-gray-200 rounded" />
            ))}
          </div>
        </div>
      </section>
      <section className="grid grid-cols-1 gap-4">
        <div className="card p-4 space-y-2">
          <div className="h-4 w-48 bg-gray-200 rounded" />
          <div className="space-y-2">
            {[...Array(5)].map((_, idx) => (
              <div key={idx} className="h-5 w-full bg-gray-200 rounded" />
            ))}
          </div>
        </div>
      </section>
      <section className="space-y-3">
        <div className="h-5 w-32 bg-gray-200 rounded" />
        <div className="card p-4 space-y-2">
          {[...Array(3)].map((_, idx) => (
            <div key={idx} className="h-5 w-full bg-gray-200 rounded" />
          ))}
        </div>
      </section>
    </main>
  );
}
