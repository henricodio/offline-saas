import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";

export default async function EditProductPage({ params }: { params: { id: string } }) {
  const sb = supabaseServer;
  const { data: product, error } = await sb
    .from("products")
    .select("id, name, external_id, category, price, stock")
    .eq("id", params.id)
    .single();

  if (error) return notFound();
  if (!product) return notFound();

  async function updateProduct(formData: FormData) {
    "use server";
    const name = ((formData.get("name") as string) || "").trim();
    const external_id = ((formData.get("external_id") as string) || "").trim() || null;
    const category = ((formData.get("category") as string) || "").trim() || null;
    const rawPrice = (formData.get("price") as string) || "";
    const rawStock = (formData.get("stock") as string) || "";
    const price = rawPrice !== "" && !Number.isNaN(Number(rawPrice)) ? Number(rawPrice) : null;
    const stock = rawStock !== "" && Number.isFinite(Number(rawStock)) ? Number(rawStock) : null;

    if (!name) {
      redirect(`/products/${params.id}?error=Nombre%20requerido`);
    }

    const sb = supabaseServer;
    const { error: upErr } = await sb
      .from("products")
      .update({ name, external_id, category, price, stock })
      .eq("id", params.id);

    if (upErr) {
      redirect(`/products?error=${encodeURIComponent(upErr.message)}`);
    }

    revalidatePath("/products");
    redirect("/products");
  }

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="toolbar">
        <h1 className="text-2xl font-semibold">Editar producto</h1>
        <div className="flex items-center gap-2">
          <Link href="/products" className="btn btn-ghost btn-md">Cancelar</Link>
        </div>
      </div>

      <form action={updateProduct} className="space-y-4">
        <div>
          <label className="block text-sm mb-1">Nombre</label>
          <input name="name" required defaultValue={product.name ?? ''} className="input w-full" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">SKU</label>
            <input name="external_id" defaultValue={product.external_id ?? ''} className="input w-full" />
          </div>
          <div>
            <label className="block text-sm mb-1">Categoría</label>
            <input name="category" defaultValue={product.category ?? ''} className="input w-full" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">Precio</label>
            <input name="price" type="number" step="0.01" min="0" defaultValue={product.price ?? ''} className="input w-full" />
          </div>
          <div>
            <label className="block text-sm mb-1">Stock</label>
            <input name="stock" type="number" min="0" defaultValue={product.stock ?? ''} className="input w-full" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button type="submit" className="btn btn-primary btn-md">Guardar cambios</button>
          <Link href="/products" className="btn btn-ghost btn-md">Cancelar</Link>
        </div>
      </form>
    </main>
  );
}
