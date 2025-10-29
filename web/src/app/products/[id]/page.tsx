import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import ProductDetailCard from "@/components/ProductDetailCard";

type Product = {
  id: string;
  name: string;
  price: number | null;
  stock: number | null;
  category: string | null;
  external_id: string | null;
  created_at: string | null;
};

export default async function ProductDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = supabaseServer;

  const { data: productRow, error: pErr } = await sb
    .from("products")
    .select("id, name, price, stock, category, external_id, created_at")
    .eq("id", id)
    .single();

  if (pErr) console.error(pErr);
  if (!productRow) return notFound();

  const product: Product = productRow as Product;

  // Obtener estadísticas de ventas del producto
  type OrderItemRow = { cantidad: number; total_linea: number; created_at?: string };
  let totalSold = 0;
  let totalRevenue = 0;
  let lastSold: string | null = null;

  try {
    const { data: orderItems } = await sb
      .from("order_items")
      .select("cantidad, total_linea, created_at")
      .eq("nombre_producto", product.name)
      .order("created_at", { ascending: false })
      .limit(1000);

    if (orderItems && orderItems.length > 0) {
      const items = orderItems as OrderItemRow[];
      totalSold = items.reduce((sum, item) => sum + (item.cantidad || 0), 0);
      totalRevenue = items.reduce((sum, item) => sum + (item.total_linea || 0), 0);
      lastSold = items[0]?.created_at || null;
    }
  } catch (error) {
    console.error("Error fetching product stats:", error);
  }

  return (
    <ProductDetailCard
      product={{
        id: product.id,
        name: product.name,
        price: product.price,
        stock: product.stock,
        category: product.category,
        external_id: product.external_id,
        created_at: product.created_at,
      }}
      stats={{
        totalSold,
        totalRevenue,
        lastSold,
      }}
    />
  );
}
