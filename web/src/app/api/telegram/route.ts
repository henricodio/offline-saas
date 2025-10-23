export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { createClient } from '@supabase/supabase-js';

const TOKEN = process.env.BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || '';
const SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || '';
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || '';

const API = TOKEN ? `https://api.telegram.org/bot${TOKEN}` : '';

// Tipos mínimos para Telegram y filas de BD
type TgChat = { id: number };
type TgMessage = { chat?: TgChat; text?: string };
type TgCallbackQuery = { id: string; data?: string; message?: { chat?: TgChat } };
type TgUpdate = { message?: TgMessage; callback_query?: TgCallbackQuery };


function sb() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
    console.error('[Telegram Bot] Supabase vars missing:', { 
      hasUrl: !!SUPABASE_URL, 
      hasKey: !!SUPABASE_SERVICE_ROLE 
    });
    return null;
  }
  console.log('[Telegram Bot] Supabase connected:', SUPABASE_URL.substring(0, 30) + '...');
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
    '/cliente Nombre | contacto | direccion - crea cliente',
    '/pedido ClienteUUID o Nombre | total | estado(opc) - crea pedido',
    '/estado orderId - estado de un pedido',
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
  const [nombre, contacto, direccion] = parts(argText);
  if (!nombre) return sendMessage(chatId, 'Uso: /cliente Nombre | contacto | direccion');
  const { data, error } = await supabase
    .from('clients')
    .insert({ nombre, contacto: contacto ?? null, direccion: direccion ?? null })
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

async function handleEstado(argText: string, chatId: number) {
  const supabase = sb();
  if (!supabase) return sendMessage(chatId, 'Config de servidor faltante.');
  const idText = argText.trim();
  if (!idText) return sendMessage(chatId, 'Uso: /estado orderId');
  const { data, error } = await supabase
    .from('orders')
    .select('id, total, fecha, created_at, estado')
    .eq('id', idText)
    .maybeSingle();
  if (error || !data) return sendMessage(chatId, 'Pedido no encontrado.');
  const fecha = data.fecha ?? (data.created_at ? String(data.created_at).slice(0, 10) : '-');
  const total = Number(data.total ?? 0).toFixed(2);
  const estado = data.estado ?? '-';
  return sendMessage(chatId, `Pedido ${data.id}\nFecha: ${fecha}\nEstado: ${estado}\nTotal: ${total}`);
}

// Endpoint de salud: GET /api/telegram?secret=...&health=1
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    if (SECRET && url.searchParams.get('secret') !== SECRET) {
      return new Response('unauthorized', { status: 401 });
    }

    const health = url.searchParams.get('health');
    if (!health) return new Response('ok');

    const hasToken = !!TOKEN;
    const hasUrl = !!SUPABASE_URL;
    const hasKey = !!SUPABASE_SERVICE_ROLE;

    const client = sb();
    if (!client) {
      return Response.json({ ok: false, hasToken, hasUrl, hasKey, canConnect: false });
    }

    const { data, error } = await client.from('clients').select('id').limit(1);
    return Response.json({
      ok: !error,
      hasToken,
      hasUrl,
      hasKey,
      canConnect: !error,
      sample: (data || []).length,
      error: error?.message,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return Response.json({ ok: false, error: msg });
  }
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