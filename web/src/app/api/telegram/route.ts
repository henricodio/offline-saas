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
type ClientRow = { id: string; nombre: string | null };

function sb() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) return null;
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, { auth: { persistSession: false } });
}

async function tg(method: string, payload: unknown) {
  if (!API) return;
  await fetch(`${API}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

type InlineButton = { text: string; callback_data: string };
type InlineKeyboard = InlineButton[][];

async function sendMessage(chatId: number, text: string, inline_keyboard?: InlineKeyboard) {
  const payload: { chat_id: number; text: string; reply_markup?: { inline_keyboard: InlineKeyboard } } = { chat_id: chatId, text };
  if (inline_keyboard) payload.reply_markup = { inline_keyboard };
  await tg('sendMessage', payload);
}

async function answerCallbackQuery(id: string, text?: string) {
  await tg('answerCallbackQuery', { callback_query_id: id, text });
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
    '/menu - menú principal',
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
    row = data as OrderRow | null;
  } else {
    const { data } = await supabase
      .from('orders')
      .select('id, total, fecha, created_at, estado')
      .eq('id', idText)
      .maybeSingle();
    row = data as OrderRow | null;
  }
  if (!row) return sendMessage(chatId, 'Pedido no encontrado.');
  const fecha = row.fecha ?? (row.created_at ? String(row.created_at).slice(0, 10) : '-');
  const total = Number(row.total ?? 0).toFixed(2);
  const estado = row.estado ?? '-';
  const codeShown = row.short_code ? `#${row.short_code}` : row.id;
  return sendMessage(chatId, `Pedido ${codeShown}\nFecha: ${fecha}\nEstado: ${estado}\nTotal: ${total}`);
}

function mainMenuKeyboard(): InlineKeyboard {
  return [
    [{ text: '👥 Clientes', callback_data: 'menu:clients:0' }],
    [{ text: '🧾 Pedidos', callback_data: 'menu:orders' }],
    [{ text: 'ℹ️ Ayuda', callback_data: 'menu:help' }],
  ];
}

async function showMainMenu(chatId: number) {
  await sendMessage(chatId, 'Menú principal', mainMenuKeyboard());
}

const CLIENTS_PAGE_SIZE = 10;

function buildClientsKeyboard(clients: { id: string; nombre: string | null }[], page: number, total: number): InlineKeyboard {
  const rows: InlineKeyboard = [];
  for (const c of clients) {
    rows.push([{ text: c.nombre || 'N/D', callback_data: `client:show:${c.id}` }]);
  }
  const totalPages = Math.max(1, Math.ceil(total / CLIENTS_PAGE_SIZE));
  const hasPrev = page > 0;
  const hasNext = page + 1 < totalPages;
  const nav: InlineButton[] = [];
  if (hasPrev) nav.push({ text: '◀️ Anterior', callback_data: `menu:clients:${page - 1}` });
  if (hasNext) nav.push({ text: 'Siguiente ▶️', callback_data: `menu:clients:${page + 1}` });
  if (nav.length) rows.push(nav);
  rows.push([{ text: '⬅️ Menú', callback_data: 'menu:home' }]);
  return rows;
}

async function showClientsPage(chatId: number, page = 0) {
  const supabase = sb();
  if (!supabase) return sendMessage(chatId, 'Config de servidor faltante.');
  const from = page * CLIENTS_PAGE_SIZE;
  const to = from + CLIENTS_PAGE_SIZE - 1;
  const { data, count, error } = await supabase
    .from('clients')
    .select('id,nombre', { count: 'exact' })
    .order('nombre', { ascending: true })
    .range(from, to);
  if (error) return sendMessage(chatId, `Error listando clientes: ${error.message}`);
  const total = count || 0;
  const rows = (data as ClientRow[] | null) ?? [];
  const kb = buildClientsKeyboard(rows.map(r => ({ id: r.id, nombre: r.nombre })), page, total);
  await sendMessage(chatId, `Clientes — Página ${page + 1} de ${Math.max(1, Math.ceil(total / CLIENTS_PAGE_SIZE))}`, kb);
}

async function showClient(chatId: number, clientId: string) {
  const supabase = sb();
  if (!supabase) return sendMessage(chatId, 'Config de servidor faltante.');
  const { data, error } = await supabase
    .from('clients')
    .select('id,nombre,contacto,direccion,category,route')
    .eq('id', clientId)
    .maybeSingle();
  if (error || !data) return sendMessage(chatId, 'Cliente no encontrado.');
  const d = data as { id: string; nombre: string | null; contacto: string | null; direccion: string | null; category: string | null; route: string | null };
  const texto =
    `Cliente\n` +
    `• Nombre: ${d.nombre ?? 'N/D'}\n` +
    `• Contacto: ${d.contacto ?? 'N/D'}\n` +
    `• Dirección: ${d.direccion ?? 'N/D'}\n` +
    `• Categoría: ${d.category ?? 'N/D'}\n` +
    `• Ciudad: ${d.route ?? 'N/D'}`;
  const kb: InlineKeyboard = [
    [{ text: '⬅️ Volver a clientes', callback_data: 'menu:clients:0' }],
    [{ text: '⬅️ Menú', callback_data: 'menu:home' }],
  ];
  await sendMessage(chatId, texto, kb);
}

function parseCb(data: string) {
  const [ns, action, arg] = (data || '').split(':');
  return { ns, action, arg };
}

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    if (SECRET && url.searchParams.get('secret') !== SECRET) {
      return new Response('unauthorized', { status: 401 });
    }

    let update: TgUpdate = {} as TgUpdate;
    try { update = await req.json(); } catch {}

    const msg = update.message;
    const cbq = update.callback_query;
    const chatId: number | undefined = msg?.chat?.id ?? cbq?.message?.chat?.id;

    if (cbq?.id) {
      await answerCallbackQuery(cbq.id);
      const data = cbq.data || '';
      const { ns, action, arg } = parseCb(data);
      if (!chatId) return new Response('ok');

      if (ns === 'menu') {
        if (action === 'home') {
          await showMainMenu(chatId);
          return new Response('ok');
        }
        if (action === 'clients') {
          const page = Math.max(0, Number(arg || '0') || 0);
          await showClientsPage(chatId, page);
          return new Response('ok');
        }
        if (action === 'orders') {
          await sendMessage(chatId, 'Menú de pedidos en construcción.');
          return new Response('ok');
        }
        if (action === 'help') {
          await sendMessage(chatId, helpText());
          return new Response('ok');
        }
      }

      if (ns === 'client' && action === 'show' && arg) {
        await showClient(chatId, arg);
        return new Response('ok');
      }

      await sendMessage(chatId, 'Acción no reconocida. Usa /menu.');
      return new Response('ok');
    }

    const text = (msg?.text || '').trim();
    if (!chatId) return new Response('ok');

    if (text.startsWith('/start')) {
      await sendMessage(chatId, '¡Hola! Bot conectado en Vercel + Supabase. Usa /menu o /help.');
      await showMainMenu(chatId);
      return new Response('ok');
    }
    if (text.startsWith('/menu')) {
      await showMainMenu(chatId);
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

    await sendMessage(chatId, 'Comando no reconocido. Usa /menu o /help.');
    return new Response('ok');
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'unknown';
    return new Response(`error: ${message}`, { status: 200 });
  }
}
