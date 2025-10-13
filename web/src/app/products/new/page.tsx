import { redirect } from "next/navigation";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";

export default function NewProductPage() {
  async function createProduct(formData: FormData) {
    "use server";
    const name = (formData.get("name") as string)?.trim();
    const external_id = ((formData.get("external_id") as string) || "").trim() || null;
    const category = ((formData.get("category") as string) || "").trim() || null;

    const rawPrice = (formData.get("price") as string) || "";
    const rawStock = (formData.get("stock") as string) || "";
    const price = rawPrice !== "" && !Number.isNaN(Number(rawPrice)) ? Number(rawPrice) : null;
    const stock = rawStock !== "" && Number.isFinite(Number(rawStock)) ? Number(rawStock) : null;

    if (!name) {
      redirect("/products?error=Nombre%20requerido");
    }

    const sb = supabaseServer;
    const { error } = await sb
      .from("products")
      .insert({ name, external_id, category, price, stock })
      .select("id")
      .single();

    if (error) {
      redirect(`/products?error=${encodeURIComponent(error.message)}`);
    }

    revalidatePath("/products");
    redirect("/products");
  }

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="toolbar">
        <h1 className="text-2xl font-semibold">Agregar producto</h1>
        <div className="flex items-center gap-2">
          <Link href="/products" className="btn btn-ghost btn-md">Cancelar</Link>
        </div>
      </div>

      <form action={createProduct} className="space-y-4">
        <div>
          <label className="block text-sm mb-1">Nombre</label>
          <input name="name" required placeholder="Ej. Botella de agua" className="input w-full" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">SKU</label>
            <input name="external_id" placeholder="Ej. SKU-001" className="input w-full" />
          </div>
          <div>
            <label className="block text-sm mb-1">Categoría</label>
            <input name="category" placeholder="Ej. Bebidas" className="input w-full" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">Precio</label>
            <input name="price" type="number" step="0.01" min="0" placeholder="0.00" className="input w-full" />
          </div>
          <div>
            <label className="block text-sm mb-1">Stock</label>
            <input name="stock" type="number" min="0" placeholder="0" className="input w-full" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button type="submit" className="btn btn-primary btn-md">Guardar</button>
          <Link href="/products" className="btn btn-ghost btn-md">Cancelar</Link>
        </div>
      </form>
    </main>
  );
}
