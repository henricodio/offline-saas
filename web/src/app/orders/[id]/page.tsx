import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

type Order = {
  id: string;
  fecha: string | null;
  created_at: string | null;
  estado: string | null;
  total: number | null;
  cliente_id: string;
  clients?: { id: string; nombre: string | null } | null;
  short_code?: string | null;
};

type OrderItem = {
  id: string;
  order_id: string;
  nombre_producto: string | null;
  precio_unitario: number;
  cantidad: number;
  total_linea: number;
};

function fmtMoney(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default async function OrderDetail({ params }: { params: { id: string } }) {
  const sb = supabaseServer;

  // Intentar traer short_code si la vista existe
  let order: Order | null = null;
  try {
    const { data, error } = await sb
      .from("orders_with_short_code")
      .select("id, fecha, created_at, estado, total, cliente_id, short_code, clients ( id, nombre )")
      .eq("id", params.id)
      .single();
    if (error) throw error;
    order = data as unknown as Order;
  } catch {
    const { data } = await sb
      .from("orders")
      .select("id, fecha, created_at, estado, total, cliente_id, clients ( id, nombre )")
      .eq("id", params.id)
      .single();
    order = (data as unknown as Order) ?? null;
  }

  if (!order) return notFound();

  const { data: items } = await sb
    .from("order_items")
    .select("id, order_id, nombre_producto, precio_unitario, cantidad, total_linea")
    .eq("order_id", params.id)
    .order("created_at", { ascending: true });

  const lines = (items as OrderItem[]) ?? [];

  // Sugerencias de productos para el formulario de alta de ítems
  const { data: productSuggestRows } = await sb
    .from("products")
    .select("name, price")
    .order("name", { ascending: true })
    .limit(500);
  const productSuggest = (productSuggestRows as { name: string | null; price: number | null }[] | null) ?? [];

  async function addItem(formData: FormData) {
    "use server";
    const nombre_producto = ((formData.get("nombre_producto") as string) || "").trim();
    const rawPrecio = ((formData.get("precio_unitario") as string) || "").trim();
    const rawCantidad = ((formData.get("cantidad") as string) || "").trim();
    const precio_unitario = rawPrecio !== "" && !Number.isNaN(Number(rawPrecio)) ? Number(rawPrecio) : 0;
    const cantidad = rawCantidad !== "" && Number.isFinite(Number(rawCantidad)) ? Number(rawCantidad) : 1;

    const total_linea = Number((precio_unitario * cantidad).toFixed(2));

    const sb = supabaseServer;
    if (!nombre_producto) {
      redirect(`/orders/${params.id}?error=Producto%20requerido`);
    }
    const { error } = await sb
      .from("order_items")
      .insert({ order_id: params.id, nombre_producto, precio_unitario, cantidad, total_linea });
    if (error) {
      redirect(`/orders/${params.id}?error=${encodeURIComponent(error.message)}`);
    }

    // Recalcular total del pedido
    const { data: sumRows } = await sb
      .from("order_items")
      .select("total_linea")
      .eq("order_id", params.id);
    const newTotal = (sumRows || []).reduce((acc: number, r: { total_linea: number }) => acc + Number(r.total_linea || 0), 0);
    await sb.from("orders").update({ total: newTotal }).eq("id", params.id);

    revalidatePath(`/orders/${params.id}`);
    redirect(`/orders/${params.id}`);
  }

  async function deleteItem(formData: FormData) {
    "use server";
    const itemId = (formData.get("item_id") as string) || "";
    const sb = supabaseServer;
    if (itemId) {
      await sb.from("order_items").delete().eq("id", itemId);
      const { data: sumRows } = await sb
        .from("order_items")
        .select("total_linea")
        .eq("order_id", params.id);
      const newTotal = (sumRows || []).reduce((acc: number, r: { total_linea: number }) => acc + Number(r.total_linea || 0), 0);
      await sb.from("orders").update({ total: newTotal }).eq("id", params.id);
    }
    revalidatePath(`/orders/${params.id}`);
    redirect(`/orders/${params.id}`);
  }

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Pedido #{order.short_code ?? order.id}</h1>
        <div className="flex gap-2 text-sm">
          <Link href="/orders" className="btn btn-ghost btn-sm">Volver</Link>
          {order.clients?.id ? (
            <Link href={`/clients/${order.clients.id}`} className="btn btn-ghost btn-sm">Ver cliente</Link>
          ) : null}
          <Link href={`/sales/new?fromOrder=${order.id}`} className="btn btn-primary btn-sm">🔁 Repetir</Link>
        </div>
      </div>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="text-sm text-gray-500">Cliente</div>
          <div className="text-base">{order.clients?.nombre ?? "-"}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-gray-500">Fecha</div>
          <div className="text-base">{order.fecha ?? order.created_at?.slice(0, 10) ?? "-"}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-gray-500">Estado</div>
          <div className="text-base">{order.estado ?? "-"}</div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Detalle</h2>
        {/* Formulario para agregar ítems al pedido */}
        <form action={addItem} className="card p-4 grid grid-cols-1 sm:grid-cols-6 gap-3 items-end">
          <div className="sm:col-span-3">
            <label className="block text-sm mb-1">Producto</label>
            <input list="productOptions" name="nombre_producto" placeholder="Ej. Producto" className="input w-full" />
            <datalist id="productOptions">
              {productSuggest.map((p, idx) => (
                <option key={`${p.name}-${idx}`} value={p.name ?? ''} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="block text-sm mb-1">Precio unitario</label>
            <input name="precio_unitario" type="number" step="0.01" min="0" placeholder="0.00" className="input w-full" />
          </div>
          <div>
            <label className="block text-sm mb-1">Cantidad</label>
            <input name="cantidad" type="number" min="1" step="1" placeholder="1" className="input w-full" />
          </div>
          <div className="sm:col-span-1">
            <button type="submit" className="btn btn-primary btn-md w-full">Agregar ítem</button>
          </div>
        </form>
        {lines.length === 0 ? (
          <p className="text-sm text-gray-500">Este pedido no tiene ítems.</p>
        ) : (
          <div className="overflow-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th className="text-right">Precio</th>
                  <th className="text-right">Cant.</th>
                  <th className="text-right">Total</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((li) => (
                  <tr key={li.id}>
                    <td>{li.nombre_producto ?? "-"}</td>
                    <td className="text-right">${""}{fmtMoney(Number(li.precio_unitario))}</td>
                    <td className="text-right">{li.cantidad}</td>
                    <td className="text-right">${""}{fmtMoney(Number(li.total_linea))}</td>
                    <td className="text-right">
                      <form action={deleteItem}>
                        <input type="hidden" name="item_id" value={li.id} />
                        <button type="submit" className="btn btn-ghost btn-sm text-red-500">Eliminar</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td className="font-medium" colSpan={3}>Total</td>
                  <td className="text-right font-semibold">${""}{fmtMoney(Number(order.total ?? 0))}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
