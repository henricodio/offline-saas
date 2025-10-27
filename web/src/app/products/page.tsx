import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { Plus, Package } from "lucide-react";
import EmptyState from "@/components/EmptyState";
import ProductCard from "@/components/ProductCard";

type Product = {
  id: string;
  name: string;
  price: number | null;
  stock: number | null;
  category: string | null;
  external_id: string | null;
};

const PAGE_SIZE = 10;

function num(v: string | string[] | undefined, def = 1) {
  const n = typeof v === "string" ? parseInt(v, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : def;
}

// buildQS util se define más abajo con preservación de sort/order/category

export default async function ProductsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Permite previsualizar la UI sin .env local (evita llamadas a Supabase)
  const hasEnv = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!hasEnv) {
    return (
      <main className="max-w-5xl mx-auto p-6 space-y-5">
        <div className="toolbar">
          <h1 className="text-2xl font-semibold">Productos</h1>
          <div className="flex items-center gap-2">
            <Link href="/" className="btn btn-ghost btn-md">Dashboard</Link>
            <Link href="/clients" className="btn btn-ghost btn-md">Clientes</Link>
            <Link href="/orders" className="btn btn-ghost btn-md">Pedidos</Link>
          </div>
        </div>
        <p className="text-sm text-orange-600">Configura NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en <code>.env.local</code> para cargar los datos.</p>
        <div className="card p-4 text-sm text-[var(--muted-foreground)]">
          La interfaz está disponible para previsualización, pero los datos no se cargarán hasta configurar Supabase.
        </div>
      </main>
    );
  }


  const qs = (await searchParams) || {};
  const q = typeof qs.q === "string" ? qs.q.trim() : "";
  const selectedCategory = typeof qs.category === "string" ? qs.category : "";
  const sortParam = typeof qs.sort === "string" ? qs.sort : "name";
  const orderParam = typeof qs.order === "string" ? qs.order : "asc";
  const page = num(qs.page, 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const sb = supabaseServer;

  const baseSelect = sb
    .from("products")
    .select("id, name, price, stock, category, external_id, created_at");
  const baseCount = sb.from("products").select("id", { count: "exact", head: true });

  const allowedSort = new Set(["name", "external_id", "price", "stock", "category", "created_at"]);
  const sortCol = allowedSort.has(sortParam) ? sortParam : "name";
  const ascending = orderParam === "asc";

  let listQuery = baseSelect;
  let countQuery = baseCount;

  if (q) {
    const orFilter = `name.ilike.%${q}%,external_id.ilike.%${q}%,category.ilike.%${q}%`;
    listQuery = listQuery.or(orFilter);
    countQuery = countQuery.or(orFilter);
  }

  if (selectedCategory) {
    listQuery = listQuery.eq("category", selectedCategory);
    countQuery = countQuery.eq("category", selectedCategory);
  }

  listQuery = listQuery.order(sortCol, { ascending }).range(from, to);

  const [{ data: rows, error: listError }, { count, error: countError }] = await Promise.all([
    listQuery,
    countQuery,
  ]);

  let errMsg: string | null = null;
  if (listError) errMsg = listError.message;
  if (countError) errMsg = (errMsg ? `${errMsg} | ` : "") + countError.message;

  const products: Product[] = (rows as Product[]) ?? [];
  const { data: catsRaw } = await sb
    .from("products")
    .select("category")
    .not("category", "is", null)
    .order("category", { ascending: true })
    .limit(1000);
  const categories = Array.from(new Set(((catsRaw as { category: string | null }[] ) ?? []).map(c => c.category).filter(Boolean))) as string[];
  const total = count ?? 0;
  const hasPrev = page > 1;
  const hasNext = page * PAGE_SIZE < total;

  function buildQS(params: Record<string, string | undefined>) {
    const usp = new URLSearchParams();
    usp.set("q", q);
    if (selectedCategory) usp.set("category", selectedCategory);
    usp.set("sort", sortCol);
    usp.set("order", orderParam);
    Object.entries(params).forEach(([k, v]) => { if (v) usp.set(k, v); });
    return `?${usp.toString()}`;
  }


  return (
    <main className="max-w-5xl mx-auto p-6 space-y-5">
      <div className="toolbar">
        <h1 className="text-2xl font-semibold">Productos</h1>
        <div className="flex items-center gap-2">
          <Link href="/products/new" className="btn btn-primary btn-md"><Plus size={16} /> Agregar producto</Link>
        </div>
      </div>

      <form method="get" className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Buscar por nombre, SKU o categoría"
          className="input w-full"
        />
        <button type="submit" className="btn btn-primary btn-md">Buscar</button>
      </form>

      {/* Filtro por categoría (chips con scroll horizontal) */}
      {categories.length > 0 ? (
        <div className="card p-3">
          <div className="text-xs text-[var(--muted-foreground)] mb-2">Categorías</div>
          <div className="overflow-x-auto">
            <div className="flex gap-2 whitespace-nowrap">
              <Link
                href={buildQS({ q: q || undefined, page: "1" })}
                className={selectedCategory
                  ? "chip"
                  : "chip bg-[var(--primary)] text-[var(--primary-foreground)]"}
                aria-current={!selectedCategory ? "page" : undefined}
              >
                Todas
              </Link>
              {categories.map((c) => (
                <Link
                  key={c}
                  href={buildQS({ q: q || undefined, category: c, page: "1" })}
                  className={selectedCategory === c
                    ? "chip bg-[var(--primary)] text-[var(--primary-foreground)]"
                    : "chip"}
                  aria-current={selectedCategory === c ? "page" : undefined}
                >
                  {c}
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {errMsg ? <p className="text-sm text-orange-600">{errMsg}</p> : null}

      {products.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No hay productos"
          description={q || selectedCategory
            ? "No se encontraron productos con los filtros aplicados. Intenta con otros criterios de búsqueda."
            : "Tu catálogo está vacío. Agrega productos para comenzar a gestionar tu inventario y ventas."
          }
          action={
            <Link href="/products/new" className="btn btn-primary btn-md inline-flex items-center gap-2">
              <Plus size={16} />
              Agregar Producto
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((p) => (
            <ProductCard
              key={p.id}
              id={p.id}
              name={p.name}
              price={p.price}
              stock={p.stock}
              category={p.category}
              external_id={p.external_id}
            />
          ))}
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        <div className="text-sm text-gray-500">
          Página {page} · {total} resultados
        </div>
        <div className="flex gap-2">
          {hasPrev ? (
            <Link href={buildQS({ q: q || undefined, page: String(page - 1) })} className="btn btn-ghost btn-sm">
              ◀️ Anterior
            </Link>
          ) : null}
          {hasNext ? (
            <Link href={buildQS({ q: q || undefined, page: String(page + 1) })} className="btn btn-ghost btn-sm">
              Siguiente ▶️
            </Link>
          ) : null}
        </div>
      </div>
    </main>
  );
}
