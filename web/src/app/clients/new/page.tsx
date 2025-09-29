import { redirect } from "next/navigation";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";

export default function NewClientPage() {
  async function createClient(formData: FormData) {
    "use server";
    const nombre = (formData.get("nombre") as string)?.trim();
    const contacto = (formData.get("contacto") as string)?.trim() || null;
    const phone = (formData.get("phone") as string)?.trim() || null;
    const direccion = (formData.get("direccion") as string)?.trim() || null;
    const city = (formData.get("city") as string)?.trim() || null;
    const route = (formData.get("route") as string)?.trim() || null;

    if (!nombre) {
      // Fallback: si no hay nombre, volver a /clients con aviso simple
      redirect("/clients?error=Nombre%20requerido");
    }

    const sb = supabaseServer;
    const { data, error } = await sb
      .from("clients")
      .insert({ nombre, contacto, phone, direccion, city, route })
      .select("id")
      .single();

    if (error) {
      redirect(`/clients?error=${encodeURIComponent(error.message)}`);
    }

    revalidatePath("/clients");
    redirect(`/clients/${data?.id}`);
  }

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="toolbar">
        <h1 className="text-2xl font-semibold">Agregar cliente</h1>
        <div className="flex items-center gap-2">
          <Link href="/clients" className="btn btn-ghost btn-md">Cancelar</Link>
        </div>
      </div>

      <form action={createClient} className="space-y-4">
        <div>
          <label className="block text-sm mb-1">Nombre</label>
          <input name="nombre" required placeholder="Ej. Juan Pérez" className="input w-full" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">Contacto</label>
            <input name="contacto" placeholder="Ej. juan@correo.com" className="input w-full" />
          </div>
          <div>
            <label className="block text-sm mb-1">Teléfono</label>
            <input name="phone" placeholder="Ej. +5491122334455" className="input w-full" />
          </div>
        </div>
        <div>
          <label className="block text-sm mb-1">Dirección</label>
          <input name="direccion" placeholder="Calle 123, Barrio" className="input w-full" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">Ciudad</label>
            <input name="city" placeholder="Ej. Buenos Aires" className="input w-full" />
          </div>
          <div>
            <label className="block text-sm mb-1">Ruta</label>
            <input name="route" placeholder="Ej. Zona Norte" className="input w-full" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button type="submit" className="btn btn-primary btn-md">Guardar</button>
          <Link href="/clients" className="btn btn-ghost btn-md">Cancelar</Link>
        </div>
      </form>
    </main>
  );
}
