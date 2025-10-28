import { supabaseServer } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q')?.trim();

    if (!query || query.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const sb = supabaseServer;
    const results = [];

    // Search clients
    const { data: clients } = await sb
      .from('clients')
      .select('id, nombre')
      .ilike('nombre', `%${query}%`)
      .limit(5);

    if (clients) {
      results.push(
        ...clients.map((client) => ({
          id: client.id,
          name: client.nombre,
          type: 'client' as const,
          url: `/clients/${client.id}`,
        }))
      );
    }

    // Search orders
    const { data: orders } = await sb
      .from('orders')
      .select('id, cliente_id, clients(nombre)')
      .ilike('id', `%${query}%`)
      .limit(5);

    if (orders) {
      results.push(
        ...orders.map((order: { id: string; cliente_id: string; clients: Array<{ nombre: string }> }) => ({
          id: order.id,
          name: `Pedido ${order.id.slice(0, 8)}... - ${order.clients?.[0]?.nombre || 'Cliente desconocido'}`,
          type: 'order' as const,
          url: `/orders/${order.id}`,
        }))
      );
    }

    // Search products
    const { data: products } = await sb
      .from('products')
      .select('id, name')
      .ilike('name', `%${query}%`)
      .limit(5);

    if (products) {
      results.push(
        ...products.map((product) => ({
          id: product.id,
          name: product.name,
          type: 'product' as const,
          url: `/products/${product.id}`,
        }))
      );
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ results: [] }, { status: 500 });
  }
}
