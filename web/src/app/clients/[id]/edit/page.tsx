import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";

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

  async function updateClient(formData: FormData) {
    "use server";
    const nombre = (formData.get("nombre") as string)?.trim();
    const contacto = (formData.get("contacto") as string)?.trim() || null;
    const phone = (formData.get("phone") as string)?.trim() || null;
    const direccion = (formData.get("direccion") as string)?.trim() || null;
    const city = (formData.get("city") as string)?.trim() || null;
    const route = (formData.get("route") as string)?.trim() || null;

    if (!nombre) {
      redirect(`/clients/${params.id}?error=Nombre%20requerido`);
    }

    const sb = supabaseServer;
    const { error: upErr } = await sb
      .from("clients")
      .update({ nombre, contacto, phone, direccion, city, route })
      .eq("id", params.id);

    if (upErr) {
      redirect(`/clients/${params.id}?error=${encodeURIComponent(upErr.message)}`);
    }

    revalidatePath("/clients");
    revalidatePath(`/clients/${params.id}`);
    redirect(`/clients/${params.id}`);
  }

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="toolbar">
        <h1 className="text-2xl font-semibold">Editar cliente</h1>
        <div className="flex items-center gap-2">
          <Link href={`/clients/${params.id}`} className="btn btn-ghost btn-md">Cancelar</Link>
        </div>
      </div>

      <form action={updateClient} className="space-y-4">
        <div>
          <label className="block text-sm mb-1">Nombre</label>
          <input name="nombre" required defaultValue={client.nombre ?? ""} className="input w-full" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">Contacto</label>
            <input name="contacto" defaultValue={client.contacto ?? ""} className="input w-full" />
          </div>
          <div>
            <label className="block text-sm mb-1">Teléfono</label>
            <input name="phone" defaultValue={client.phone ?? ""} className="input w-full" />
          </div>
        </div>
        <div>
          <label className="block text-sm mb-1">Dirección</label>
          <input name="direccion" defaultValue={client.direccion ?? ""} className="input w-full" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">Ciudad</label>
            <input name="city" defaultValue={client.city ?? ""} className="input w-full" />
          </div>
          <div>
            <label className="block text-sm mb-1">Ruta</label>
            <input name="route" defaultValue={client.route ?? ""} className="input w-full" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button type="submit" className="btn btn-primary btn-md">Guardar cambios</button>
          <Link href={`/clients/${params.id}`} className="btn btn-ghost btn-md">Cancelar</Link>
        </div>
      </form>
    </main>
  );
}
