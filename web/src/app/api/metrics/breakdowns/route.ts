import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

function toISODate(d: Date) {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toISOString().slice(0, 10);
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");

    const hasEnv = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

    const now = new Date();
    const defaultTo = toISODate(now);
    const defaultFrom = toISODate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 90));
    const fromStr = from || defaultFrom;
    const toStr = to || defaultTo;

    // Datos sintéticos si no hay env
    if (!hasEnv) {
      const cats = ["Bebidas", "Snacks", "Lácteos", "Higiene", "Otros"];
      const routes = ["Norte", "Sur", "Este", "Oeste"]; // usamos route como "canal"
      const cities = ["Madrid", "Barcelona", "Valencia", "Sevilla", "Bilbao"];
      function synth(keys: string[]) {
        return keys.map((k, i) => ({ key: k, label: k, sales: Math.round(1000 - i * 120 + (i % 3) * 50), orders: 20 - i, clients: 10 - (i % 5), sub: [
          { key: `${k}-A`, label: `${k} A`, sales: Math.round((1000 - i * 120) * 0.5) },
          { key: `${k}-B`, label: `${k} B`, sales: Math.round((1000 - i * 120) * 0.3) },
          { key: `${k}-C`, label: `${k} C`, sales: Math.round((1000 - i * 120) * 0.2) },
        ] }))
          .filter(x => x.sales > 0 && x.orders > 0 && x.clients > 0);
      }
      return NextResponse.json({
        categories: synth(cats),
        routes: synth(routes),
        cities: synth(cities),
        from: fromStr,
        to: toStr,
      }, { headers: { 'Cache-Control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=300' } });
    }

    const sb = supabaseServer;

    // 1) Orders del periodo
    type OrderRow = { id: string | number; total: number | null; cliente_id: string | null };
    const { data: orderRows, error: ordersErr } = await sb
      .from("orders")
      .select("id,total,cliente_id")
      .gte("fecha", fromStr)
      .lte("fecha", toStr)
      .limit(200000);
    if (ordersErr) throw ordersErr;
    const orders: OrderRow[] = (orderRows as OrderRow[]) || [];
    const orderIds = orders.map(o => String(o.id));

    // 2) Mapa order -> cliente, y set clientes
    const orderToClient = new Map<string, string | null>();
    const clientIds = new Set<string>();
    for (const o of orders) {
      const id = String(o.id);
      orderToClient.set(id, o.cliente_id);
      if (o.cliente_id) clientIds.add(o.cliente_id);
    }

    // 3) Datos de clientes (route, city)
    type ClientRow = { id: string; route: string | null; city: string | null };
    const routeByClient = new Map<string, string | null>();
    const cityByClient = new Map<string, string | null>();
    if (clientIds.size > 0) {
      const { data: clientsRows } = await sb
        .from("clients")
        .select("id,route,city")
        .in("id", Array.from(clientIds))
        .limit(200000);
      for (const c of (clientsRows as ClientRow[] | null) || []) {
        routeByClient.set(c.id, c.route);
        cityByClient.set(c.id, c.city);
      }
    }

    // 4) Items por orden para categorías (se requiere mapear product_id -> category)
    type ItemRow = { order_id: string | number; product_id: string | null; total_linea: number | null };
    let items: ItemRow[] = [];
    if (orderIds.length > 0) {
      const { data: itemRows } = await sb
        .from("order_items")
        .select("order_id,product_id,total_linea")
        .in("order_id", orderIds)
        .limit(300000);
      items = ((itemRows as ItemRow[] | null) || []).map(r => ({ ...r, order_id: String(r.order_id) }));
    }

    // 5) Productos para categorías
    type ProductRow = { id: string; name?: string | null; category: string | null };
    const productIds = Array.from(new Set(items.map(i => i.product_id).filter(Boolean))) as string[];
    const categoryByProduct = new Map<string, string | null>();
    const nameByProduct = new Map<string, string | null>();
    if (productIds.length > 0) {
      const { data: prodRows } = await sb
        .from("products")
        .select("id,category,name")
        .in("id", productIds)
        .limit(200000);
      for (const p of (prodRows as ProductRow[] | null) || []) {
        categoryByProduct.set(p.id, p.category);
        nameByProduct.set(p.id, p.name ?? null);
      }
    }

    // 6) Agregaciones: categories, routes (canal), cities (región)
    type Acc = { sales: number; orders: Set<string>; clients: Set<string> };
    type ChildAcc = { sales: number; label: string };

    const cats = new Map<string, Acc>();
    const routes = new Map<string, Acc>();
    const cities = new Map<string, Acc>();
    const catChildren = new Map<string, Map<string, ChildAcc>>(); // cat -> product -> acc
    const routeChildren = new Map<string, Map<string, ChildAcc>>(); // route -> city -> acc
    const cityChildren = new Map<string, Map<string, ChildAcc>>(); // city -> route -> acc

    // Categorías: usamos items (total_linea) y order->client para clientes
    for (const it of items) {
      const pid = it.product_id || "";
      const cat = categoryByProduct.get(pid || "") || "Otros";
      const key = cat || "Otros";
      const acc = cats.get(key) || { sales: 0, orders: new Set(), clients: new Set() };
      acc.sales += Number(it.total_linea || 0);
      acc.orders.add(String(it.order_id));
      const client = orderToClient.get(String(it.order_id));
      if (client) acc.clients.add(client);
      cats.set(key, acc);

      // children: top productos por categoría
      const childMap = catChildren.get(key) || new Map<string, ChildAcc>();
      const label = nameByProduct.get(pid || "") || pid || "Producto";
      const ch = childMap.get(pid || "") || { sales: 0, label: String(label) };
      ch.sales += Number(it.total_linea || 0);
      childMap.set(pid || "", ch);
      catChildren.set(key, childMap);
    }

    // Routes/cities: usamos orders (total) agrupando por route/city del cliente
    for (const o of orders) {
      const client = o.cliente_id || "";
      const route = routeByClient.get(client) || "";
      const rkey = route || "—";
      const racc = routes.get(rkey) || { sales: 0, orders: new Set(), clients: new Set() };
      racc.sales += Number(o.total || 0);
      racc.orders.add(String(o.id));
      if (client) racc.clients.add(client);
      routes.set(rkey, racc);

      const city = cityByClient.get(client) || "";
      const ckey = city || "—";
      const cacc = cities.get(ckey) || { sales: 0, orders: new Set(), clients: new Set() };
      cacc.sales += Number(o.total || 0);
      cacc.orders.add(String(o.id));
      if (client) cacc.clients.add(client);
      cities.set(ckey, cacc);

      // children: para route -> top cities
      if (rkey) {
        const rmap = routeChildren.get(rkey) || new Map<string, ChildAcc>();
        const ch = rmap.get(ckey) || { sales: 0, label: ckey || "—" };
        ch.sales += Number(o.total || 0);
        rmap.set(ckey, ch);
        routeChildren.set(rkey, rmap);
      }
      // children: para city -> top routes
      if (ckey) {
        const cmap = cityChildren.get(ckey) || new Map<string, ChildAcc>();
        const ch2 = cmap.get(rkey) || { sales: 0, label: rkey || "—" };
        ch2.sales += Number(o.total || 0);
        cmap.set(rkey, ch2);
        cityChildren.set(ckey, cmap);
      }
    }

    function topChildren(map: Map<string, ChildAcc> | undefined, limit = 5) {
      if (!map) return [] as { key: string; label: string; sales: number }[];
      return Array.from(map.entries())
        .map(([k, v]) => ({ key: k, label: v.label, sales: Math.round(v.sales) }))
        .sort((a, b) => b.sales - a.sales)
        .slice(0, limit);
    }

    function toArray(m: Map<string, Acc>, children?: Map<string, Map<string, ChildAcc>>) {
      return Array.from(m.entries()).map(([k, v]) => ({ key: k, label: k, sales: Math.round(v.sales), orders: v.orders.size, clients: v.clients.size, sub: topChildren(children?.get(k)) }))
        .sort((a, b) => b.sales - a.sales)
        .slice(0, 20);
    }

    return NextResponse.json({
      categories: toArray(cats, catChildren),
      routes: toArray(routes, routeChildren),
      cities: toArray(cities, cityChildren),
      from: fromStr,
      to: toStr,
    }, { headers: { 'Cache-Control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=300' } });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unexpected";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
