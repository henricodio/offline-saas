import { notFound } from "next/navigation";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import ProductForm from "@/components/ProductForm";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = supabaseServer;
  const { data: product, error } = await sb
    .from("products")
    .select("id, name, external_id, category, price, stock")
    .eq("id", id)
    .single();

  if (error) return notFound();
  if (!product) return notFound();

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="toolbar">
        <h1 className="text-2xl font-semibold text-gray-900">Editar producto</h1>
        <div className="flex items-center gap-2">
          <Link href="/products" className="btn btn-ghost btn-md">Cancelar</Link>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <ProductForm initialData={product} isEditing={true} />
      </div>
    </main>
  );
}
