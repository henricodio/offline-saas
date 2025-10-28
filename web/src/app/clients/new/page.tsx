import Link from "next/link";
import ClientForm from "@/components/ClientForm";

export default function NewClientPage() {
  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="toolbar">
        <h1 className="text-2xl font-semibold text-gray-900">Agregar cliente</h1>
        <div className="flex items-center gap-2">
          <Link href="/clients" className="btn btn-ghost btn-md">Cancelar</Link>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <ClientForm />
      </div>
    </main>
  );
}
