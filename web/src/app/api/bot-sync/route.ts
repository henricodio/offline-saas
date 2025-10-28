import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || '';
const BOT_TOKEN = process.env.BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || '';
const BOT_API = BOT_TOKEN ? `https://api.telegram.org/bot${BOT_TOKEN}` : '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
  auth: { persistSession: false },
});

/**
 * GET /api/bot-sync - Obtener estadísticas de sincronización
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'stats') {
      // Obtener estadísticas
      const { count: clientsCount } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true });

      const { count: ordersCount } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true });

      const { count: productsCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });

      return NextResponse.json({
        ok: true,
        stats: {
          clients: clientsCount || 0,
          orders: ordersCount || 0,
          products: productsCount || 0,
          lastSync: new Date().toISOString(),
        },
      });
    }

    if (action === 'recent-orders') {
      // Obtener pedidos recientes
      const { data, error } = await supabase
        .from('orders')
        .select('id, cliente_id, total, estado, fecha, clients(nombre)')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      return NextResponse.json({
        ok: true,
        orders: data || [],
      });
    }

    if (action === 'recent-clients') {
      // Obtener clientes recientes
      const { data, error } = await supabase
        .from('clients')
        .select('id, nombre, contacto, phone')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      return NextResponse.json({
        ok: true,
        clients: data || [],
      });
    }

    return NextResponse.json({ ok: false, error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Bot sync error:', error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/bot-sync - Enviar notificación a Telegram
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, chatId, message, data } = body;

    if (!BOT_API) {
      return NextResponse.json(
        { ok: false, error: 'Bot token not configured' },
        { status: 500 }
      );
    }

    if (action === 'notify-order') {
      // Notificar nuevo pedido
      const { cliente_id, total, estado } = data;

      const { data: client } = await supabase
        .from('clients')
        .select('nombre')
        .eq('id', cliente_id)
        .single();

      const msg = `📦 *Nuevo Pedido*\n\n👤 Cliente: ${client?.nombre}\n💰 Total: $${total}\n📊 Estado: ${estado}`;

      const response = await fetch(`${BOT_API}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: msg,
          parse_mode: 'Markdown',
        }),
      });

      if (!response.ok) throw new Error('Failed to send message');

      return NextResponse.json({ ok: true, message: 'Notification sent' });
    }

    if (action === 'notify-status-change') {
      // Notificar cambio de estado
      const { orderId, newStatus } = data;

      const msg = `✅ *Cambio de Estado*\n\n📄 Pedido: ${orderId}\n📊 Nuevo estado: ${newStatus}`;

      const response = await fetch(`${BOT_API}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: msg,
          parse_mode: 'Markdown',
        }),
      });

      if (!response.ok) throw new Error('Failed to send message');

      return NextResponse.json({ ok: true, message: 'Notification sent' });
    }

    if (action === 'send-message') {
      // Enviar mensaje personalizado
      const response = await fetch(`${BOT_API}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'Markdown',
        }),
      });

      if (!response.ok) throw new Error('Failed to send message');

      return NextResponse.json({ ok: true, message: 'Message sent' });
    }

    return NextResponse.json({ ok: false, error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Bot sync error:', error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
