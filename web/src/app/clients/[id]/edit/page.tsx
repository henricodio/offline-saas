import { notFound } from "next/navigation";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import ClientForm from "@/components/ClientForm";

export default async function EditClientPage({ params }: { params: { id: string } }) {
  const sb = supabaseServer;
  const { data: client, error } = await sb
    .from("clients")
    .select("id, nombre, contacto, phone, direccion, city, route")
    .eq("id", params.id)
    .single();

  if (error) {
    console.error(error);
    return notFound();
  }
  if (!client) return notFound();

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="toolbar">
        <h1 className="text-2xl font-semibold text-gray-900">Editar cliente</h1>
        <div className="flex items-center gap-2">
          <Link href={`/clients/${params.id}`} className="btn btn-ghost btn-md">Cancelar</Link>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <ClientForm initialData={client} isEditing={true} />
      </div>
    </main>
  );
}
