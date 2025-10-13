import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";

function looksLikeUUID(s: string) {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(s);
}

export default async function NewOrderPage() {
  const sb = supabaseServer;
  const { data: clientSuggestRows } = await sb
    .from("clients")
    .select("id, nombre")
    .order("nombre", { ascending: true })
    .limit(500);
  const clientSuggest = (clientSuggestRows as { id: string; nombre: string | null }[] | null) ?? [];

  async function createOrder(formData: FormData) {
    "use server";
    const clientInput = ((formData.get("client") as string) || "").trim();
    const fecha = ((formData.get("fecha") as string) || "").trim() || null;
    const estado = ((formData.get("estado") as string) || "").trim() || "pendiente";
    const rawTotal = ((formData.get("total") as string) || "").trim();
    const total = rawTotal !== "" && !Number.isNaN(Number(rawTotal)) ? Number(rawTotal) : null;

    if (!clientInput) {
      redirect("/orders?error=Cliente%20requerido");
    }

    let cliente_id: string | null = null;
    const sb = supabaseServer;
    if (looksLikeUUID(clientInput)) {
      cliente_id = clientInput;
    } else {
      const { data: found } = await sb
        .from("clients")
        .select("id, nombre")
        .eq("nombre", clientInput)
        .limit(1)
        .maybeSingle();
      cliente_id = found?.id ?? null;
    }

    if (!cliente_id) {
      redirect(`/orders?error=${encodeURIComponent("No se encontró el cliente")}`);
    }

    const { error } = await sb
      .from("orders")
      .insert({ cliente_id, fecha, total, estado })
      .select("id")
      .single();

    if (error) {
      redirect(`/orders?error=${encodeURIComponent(error.message)}`);
    }

    revalidatePath("/orders");
    redirect("/orders");
  }

  const today = new Date().toISOString().split("T")[0];

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="toolbar">
        <h1 className="text-2xl font-semibold">Crear pedido</h1>
        <div className="flex items-center gap-2">
          <Link href="/orders" className="btn btn-ghost btn-md">Cancelar</Link>
        </div>
      </div>

      <form action={createOrder} className="space-y-4">
        <div>
          <label className="block text-sm mb-1">Cliente</label>
          <input list="clientOptions" name="client" required placeholder="Nombre exacto o UUID" className="input w-full" />
          <datalist id="clientOptions">
            {clientSuggest.map(c => (
              <option key={c.id} value={c.nombre || ''} />
            ))}
          </datalist>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">Fecha</label>
            <input name="fecha" type="date" defaultValue={today} className="input w-full" />
          </div>
          <div>
            <label className="block text-sm mb-1">Estado</label>
            <select name="estado" defaultValue="pendiente" className="input w-full">
              <option value="pendiente">Pendiente</option>
              <option value="en_proceso">En proceso</option>
              <option value="completado">Completado</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm mb-1">Total</label>
          <input name="total" type="number" step="0.01" min="0" placeholder="0.00" className="input w-full" />
        </div>
        <div className="flex items-center gap-2">
          <button type="submit" className="btn btn-primary btn-md">Guardar</button>
          <Link href="/orders" className="btn btn-ghost btn-md">Cancelar</Link>
        </div>
      </form>
    </main>
  );
}
