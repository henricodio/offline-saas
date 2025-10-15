export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { createClient } from '@supabase/supabase-js';

const TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || '';
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || '';

const API = TOKEN ? `https://api.telegram.org/bot${TOKEN}` : '';

// Tipos mínimos para Telegram y filas de BD
type TgChat = { id: number };
type TgMessage = { chat?: TgChat; text?: string };
type TgCallbackQuery = { id: string; data?: string; message?: { chat?: TgChat } };
type TgUpdate = { message?: TgMessage; callback_query?: TgCallbackQuery };

type OrderRow = {
  id: string;
  total: number | null;
  fecha?: string | null;
  created_at?: string;
  short_code?: string;
  estado?: string | null;
};

type OrderItemRow = { total_linea: number | null };

function sb() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) return null;
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, { auth: { persistSession: false } });
}

async function sendMessage(chatId: number, text: string) {
  if (!API) return;
  await fetch(`${API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

async function answerCallbackQuery(id: string, text?: string) {
  if (!API) return;
  await fetch(`${API}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: id, text }),
  });
}

function parts(s: string) {
  return s.split('|').map(x => x.trim()).filter(Boolean);
}

function isUUID(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function helpText() {
  return [
    'Comandos:',
    '/start - saludo',
    '/help - esta ayuda',
    '/cliente Nombre | email | telefono - crea cliente',
    '/pedido ClienteUUID o Nombre | total | estado(opc) - crea pedido',
    '/item orderId | Producto | precio | cantidad - agrega ítem',
    '/estado orderId o #codigo - estado de un pedido',
  ].join('\n');
}

async function resolveClienteId(supabase: ReturnType<typeof sb>, input: string) {
  if (!supabase) return null;
  if (isUUID(input)) return input;
  const { data } = await supabase.from('clients').select('id').eq('nombre', input).maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}

async function handleCliente(argText: string, chatId: number) {
  const supabase = sb();
  if (!supabase) return sendMessage(chatId, 'Config de servidor faltante.');
  const [nombre, contacto, telefono] = parts(argText);
  if (!nombre) return sendMessage(chatId, 'Uso: /cliente Nombre | email | telefono');
  const { data, error } = await supabase
    .from('clients')
    .insert({ nombre, contacto: contacto ?? null, telefono: telefono ?? null })
    .select('id,nombre')
    .single();
  if (error) return sendMessage(chatId, `Error creando cliente: ${error.message}`);
  return sendMessage(chatId, `Cliente creado: ${data?.nombre}\nID: ${data?.id}`);
}

async function handlePedido(argText: string, chatId: number) {
  const supabase = sb();
  if (!supabase) return sendMessage(chatId, 'Config de servidor faltante.');
  const [clienteField, totalStr, estado] = parts(argText);
  if (!clienteField) return sendMessage(chatId, 'Uso: /pedido ClienteUUID o Nombre | total | estado(opc)');
  const cliente_id = await resolveClienteId(supabase, clienteField);
  if (!cliente_id) return sendMessage(chatId, 'Cliente no encontrado (usa UUID o nombre exacto).');
  const total = totalStr ? Number(totalStr) : null;
  const estadoVal = estado || 'pendiente';
  const { data, error } = await supabase
    .from('orders')
    .insert({ cliente_id, fecha: today(), total, estado: estadoVal })
    .select('id')
    .single();
  if (error) return sendMessage(chatId, `Error creando pedido: ${error.message}`);
  return sendMessage(chatId, `Pedido creado con ID: ${data?.id}\nEstado: ${estadoVal}\nTotal: ${total ?? 0}`);
}

async function recalcTotal(supabase: ReturnType<typeof sb>, orderId: string) {
  const { data } = await supabase!.from('order_items').select('total_linea').eq('order_id', orderId);
  const sum = (data as OrderItemRow[] | null ?? []).reduce(
  (acc: number, r: OrderItemRow) => acc + Number(r.total_linea ?? 0),
  0
);
  await supabase!.from('orders').update({ total: sum }).eq('id', orderId);
}

async function handleItem(argText: string, chatId: number) {
  const supabase = sb();
  if (!supabase) return sendMessage(chatId, 'Config de servidor faltante.');
  const [orderId, nombre, precioStr, cantStr] = parts(argText);
  if (!orderId || !nombre) return sendMessage(chatId, 'Uso: /item orderId | Producto | precio | cantidad');
  const precio = precioStr ? Number(precioStr) : 0;
  const cantidad = cantStr ? Number(cantStr) : 1;
  const total_linea = Number((precio * cantidad).toFixed(2));
  const { error } = await supabase
    .from('order_items')
    .insert({ order_id: orderId, nombre_producto: nombre, precio_unitario: precio, cantidad, total_linea });
  if (error) return sendMessage(chatId, `Error agregando ítem: ${error.message}`);
  await recalcTotal(supabase, orderId);
  return sendMessage(chatId, `Ítem agregado a pedido ${orderId}: ${nombre} x${cantidad} @ ${precio.toFixed(2)} = ${total_linea.toFixed(2)}`);
}

async function handleEstado(argText: string, chatId: number) {
  const supabase = sb();
  if (!supabase) return sendMessage(chatId, 'Config de servidor faltante.');
  const idText = argText.trim();
  if (!idText) return sendMessage(chatId, 'Uso: /estado orderId o #codigo');
 let row: OrderRow | null = null;
  const code = idText.startsWith('#') ? idText.slice(1) : null;
  if (code) {
    const { data } = await supabase
      .from('orders_with_short_code')
      .select('id, total, fecha, created_at, short_code, estado')
      .eq('short_code', code)
      .maybeSingle();
    row = data;
  } else {
    const { data } = await supabase
      .from('orders')
      .select('id, total, fecha, created_at, estado')
      .eq('id', idText)
      .maybeSingle();
    row = data;
  }
  if (!row) return sendMessage(chatId, 'Pedido no encontrado.');
  const fecha = row.fecha ?? (row.created_at ? String(row.created_at).slice(0, 10) : '-');
  const total = Number(row.total ?? 0).toFixed(2);
  const estado = row.estado ?? '-';
  const codeShown = row.short_code ? `#${row.short_code}` : row.id;
  return sendMessage(chatId, `Pedido ${codeShown}\nFecha: ${fecha}\nEstado: ${estado}\nTotal: ${total}`);
}

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    if (SECRET && url.searchParams.get('secret') !== SECRET) {
      return new Response('unauthorized', { status: 401 });
    }

    let update: TgUpdate = {} as TgUpdate;
    try { update = await req.json(); } catch {}

    const msg = update?.message;
    const cbq = update?.callback_query;
    const chatId: number | undefined = msg?.chat?.id ?? cbq?.message?.chat?.id;

    if (cbq?.id) {
      await answerCallbackQuery(cbq.id);
      if (chatId) await sendMessage(chatId, 'Acción de menú en construcción. Usa /help.');
      return new Response('ok');
    }

    const text = (msg?.text || '').trim();
    if (!chatId) return new Response('ok');

    if (text.startsWith('/start')) {
      await sendMessage(chatId, '¡Hola! Bot conectado en Vercel + Supabase. Usa /help para ver comandos.');
      return new Response('ok');
    }
    if (text.startsWith('/help')) {
      await sendMessage(chatId, helpText());
      return new Response('ok');
    }
    if (text.startsWith('/cliente')) {
      await handleCliente(text.replace('/cliente', '').trim(), chatId);
      return new Response('ok');
    }
    if (text.startsWith('/pedido')) {
      await handlePedido(text.replace('/pedido', '').trim(), chatId);
      return new Response('ok');
    }
    if (text.startsWith('/item')) {
      await handleItem(text.replace('/item', '').trim(), chatId);
      return new Response('ok');
    }
    if (text.startsWith('/estado')) {
      await handleEstado(text.replace('/estado', '').trim(), chatId);
      return new Response('ok');
    }

    await sendMessage(chatId, 'Comando no reconocido. Usa /help.');
    return new Response('ok');
  } catch (e: unknown) {
  const message = e instanceof Error ? e.message : 'unknown';
  return new Response(`error: ${message}`, { status: 200 });
}
}