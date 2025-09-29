export default function ClientsLoading() {
  return (
    <main className="max-w-5xl mx-auto p-6 space-y-5 animate-pulse">
      <div className="h-8 w-40 bg-gray-200 rounded" />

      <div className="space-y-2">
        <div className="h-10 w-full bg-gray-200 rounded" />
        <div className="flex items-center gap-2">
          <div className="h-8 w-28 bg-gray-200 rounded" />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-8 w-24 bg-gray-200 rounded" />
        ))}
      </div>

      <div className="overflow-auto">
        <div className="h-64 w-full bg-gray-200 rounded" />
      </div>

      <div className="flex items-center justify-between pt-2">
        <div className="h-4 w-40 bg-gray-200 rounded" />
        <div className="flex gap-2">
          <div className="h-6 w-24 bg-gray-200 rounded" />
          <div className="h-6 w-24 bg-gray-200 rounded" />
        </div>
      </div>
    </main>
  );
}
