import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import OrderForm from "@/components/OrderForm";

function looksLikeUUID(s: string) {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(s);
}

export default async function NewOrderPage() {
  const sb = supabaseServer;
  const [{ data: clientSuggestRows }, { data: productSuggestRows }] = await Promise.all([
    sb.from("clients").select("id, nombre").order("nombre", { ascending: true }).limit(500),
    sb.from("products").select("id, name, price").order("name", { ascending: true }).limit(500),
  ]);
  const clientSuggest = (clientSuggestRows as { id: string; nombre: string | null }[] | null) ?? [];
  const productSuggest = (productSuggestRows as { id: string; name: string; price: number | null }[] | null) ?? [];

  async function createOrder(formData: FormData) {
    "use server";
    const clientInput = ((formData.get("client") as string) || "").trim();
    const fecha = ((formData.get("fecha") as string) || "").trim() || null;
    const estado = ((formData.get("estado") as string) || "").trim() || "pendiente";
    const rawTotal = ((formData.get("total") as string) || "").trim();
    const total = rawTotal !== "" && !Number.isNaN(Number(rawTotal)) ? Number(rawTotal) : null;
    const itemsJson = (formData.get("items") as string) || "[]";
    let items = [];
    try {
      items = JSON.parse(itemsJson);
    } catch {}

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

    const { data: orderData, error: orderError } = await sb
      .from("orders")
      .insert({ cliente_id, fecha, total, estado })
      .select("id")
      .single();

    if (orderError) {
      redirect(`/orders?error=${encodeURIComponent(orderError.message)}`);
    }

    // Insertar items si existen
    if (items.length > 0 && orderData?.id) {
      const itemsToInsert = items.map((item: { nombre_producto: string; precio_unitario: number; cantidad: number }) => ({
        order_id: orderData.id,
        nombre_producto: item.nombre_producto,
        precio_unitario: item.precio_unitario,
        cantidad: item.cantidad,
        total_linea: item.precio_unitario * item.cantidad,
      }));
      await sb.from("order_items").insert(itemsToInsert);
    }

    revalidatePath("/orders");
    redirect("/orders");
  }

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Crear pedido</h1>
        <Link href="/orders" className="btn btn-ghost btn-md">← Volver</Link>
      </div>

      <div className="card p-6">
        <OrderForm clientSuggest={clientSuggest} productSuggest={productSuggest} onSubmit={createOrder} />
      </div>
    </main>
  );
}
