import Link from "next/link";
import ProductForm from "@/components/ProductForm";

export default function NewProductPage() {
  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="toolbar">
        <h1 className="text-2xl font-semibold text-gray-900">Agregar producto</h1>
        <div className="flex items-center gap-2">
          <Link href="/products" className="btn btn-ghost btn-md">Cancelar</Link>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <ProductForm />
      </div>
    </main>
  );
}
