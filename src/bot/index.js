require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { getSupabaseClient } = require('./supabase');

// Importar módulos refactorizados
const { initializeCommandHandler, registerCommands } = require('./handlers/commands');
const { initializeCallbackHandler, handleCallbackQuery } = require('./handlers/callbacks');
const { initializeMessageHandler, handleMessage } = require('./handlers/messages');
const { logger } = require('./utils/errorHandler');
const keyboards = require('./ui/keyboards');

// Importar servicios de negocio
const db = require('./services/database');
const business = require('./services/business');

const token = process.env.BOT_TOKEN;
if (!token) throw new Error('BOT_TOKEN no configurado en .env');

const bot = new TelegramBot(token, { polling: true });
const supabase = getSupabaseClient();

// Inicializar servicios de base de datos
db.initializeDatabase(supabase);

// Constantes globales
const PAGE_SIZE = 5;
const CLIENTS_PAGE_SIZE = 10;
const OPTIONS_PAGE_SIZE = 10;
const ORDERS_PAGE_SIZE = 10;

// Estado de usuario global
const userState = new Map();

// Utilidades básicas
function fmtDate(s) {
  const d = new Date(s);
  if (isNaN(d.getTime())) return 'N/D';
  return d.toISOString().slice(0, 10);
}

function trunc(str, maxLen) {
  if (!str) return 'N/D';
  return str.length > maxLen ? str.slice(0, maxLen - 1) + '…' : str;
}

function clearState(chatId) {
  userState.delete(chatId);
}

function ensureState(chatId) {
  let st = userState.get(chatId);
  if (!st) {
    st = { flow: null, step: null, data: {}, nav: { stack: [] } };
    userState.set(chatId, st);
  }
  if (!st.nav) st.nav = { stack: [] };
  if (!st.data) st.data = {};
  return st;
}

// === INICIALIZACIÓN ===

// Esta función se define aquí pero se ejecuta al final del archivo
// La inicialización del bot se hace al final del archivo

async function showClientResultsByText(chatId, q, page = 0) {
  const term = (q || '').trim();
  const from = page * CLIENTS_PAGE_SIZE;
  const to = from + CLIENTS_PAGE_SIZE - 1;
  const like = `%${term}%`;
  const { data: clients, count, error } = await supabase
    .from('clients')
    .select('id, nombre, contacto', { count: 'exact' })
    .or(`nombre.ilike.${like},contacto.ilike.${like},direccion.ilike.${like}`)
    .order('nombre', { ascending: true })
    .range(from, to);
  if (error) throw error;
  const total = count || 0;
  const inline_keyboard = buildClientsListKeyboardWithPrefix(
    clients || [],
    page,
    total,
    `clients_text_results_page:${encodeURIComponent(term)}:`
  );
  const totalPages = Math.max(1, Math.ceil(total / CLIENTS_PAGE_SIZE));
  const titulo = `Clientes por texto: "${term}"`;
  const texto = (clients && clients.length)
    ? `${titulo} — Total: ${total}\nPágina ${page + 1} de ${totalPages}\nToca un cliente para ver su ficha`
    : `${titulo} — Sin resultados en esta página.`;
  return bot.sendMessage(chatId, texto, { reply_markup: { inline_keyboard } });
}

// --- Menú de edición de cliente ---
function sendEditClientMenu(chatId, state) {
  const orig = state.data.original || {};
  const patch = state.data.patch || {};
  const get = (k) => (Object.prototype.hasOwnProperty.call(patch, k) ? patch[k] : orig[k]);
  const nombre = get('nombre') ?? 'N/D';
  const contacto = get('contacto') ?? 'N/D';
  const direccion = get('direccion') ?? 'N/D';
  const category = get('category') ?? 'N/D';
  const city = get('route') ?? 'N/D';
  const texto = [
    'Editar cliente: selecciona un campo para modificar.',
    `• Nombre: ${nombre}`,
    `• Contacto: ${contacto}`,
    `• Dirección: ${direccion}`,
    `• Categoría: ${category}`,
    `• Ciudad: ${city}`,
    '',
    'Consejo: usa "-" para borrar un campo o "!" para mantener sin cambios.'
  ].join('\n');
  const inline_keyboard = [
    [
      { text: 'Nombre ✏️', callback_data: 'edit_client_field_text:nombre' },
      { text: 'Contacto ✏️', callback_data: 'edit_client_field_text:contacto' }
    ],
    [
      { text: 'Dirección ✏️', callback_data: 'edit_client_field_text:direccion' },
      { text: 'Categoría 📂', callback_data: 'edit_client_field_options:category:0' }
    ],
    [
      { text: 'Ciudad 🏙️', callback_data: 'edit_client_field_options:city:0' },
      { text: '✅ Guardar', callback_data: 'confirm_edit_client' }
    ],
    [
      { text: '❌ Cancelar', callback_data: 'cancel_flow' },
      { text: '⬅️ Ficha', callback_data: `client:show:${state.data.cliente_id}` }
    ]
  ];
  return bot.sendMessage(chatId, texto, { reply_markup: { inline_keyboard } });
}

function buildEditOptionsKeyboard(options, page, type) {
  const rows = [];
  const from = page * OPTIONS_PAGE_SIZE;
  const to = from + OPTIONS_PAGE_SIZE;
  const pageItems = options.slice(from, to);
  for (let i = 0; i < pageItems.length; i += 2) {
    const o1 = pageItems[i];
    const o2 = pageItems[i + 1];
    const row = [
      { text: trunc(o1, 24), callback_data: `edit_client_select_option:${type}:${encodeURIComponent(o1)}` }
    ];
    if (o2) row.push({ text: trunc(o2, 24), callback_data: `edit_client_select_option:${type}:${encodeURIComponent(o2)}` });
    rows.push(row);
  }
  const totalPages = Math.max(1, Math.ceil(options.length / OPTIONS_PAGE_SIZE));
  const hasPrev = page > 0;
  const hasNext = page + 1 < totalPages;
  if (hasPrev || hasNext) {
    const nav1 = [];
    if (hasPrev) {
      nav1.push({ text: '⏮️ Primera', callback_data: `edit_client_options_page:${type}:0` });
      nav1.push({ text: '◀️ Anterior', callback_data: `edit_client_options_page:${type}:${page - 1}` });
    }
    if (nav1.length) rows.push(nav1);
    const nav2 = [];
    if (hasNext) {
      const last = totalPages - 1;
      nav2.push({ text: 'Siguiente ▶️', callback_data: `edit_client_options_page:${type}:${page + 1}` });
      nav2.push({ text: 'Última ⏭️', callback_data: `edit_client_options_page:${type}:${last}` });
    }
    if (nav2.length) rows.push(nav2);
  }
  rows.push([
    { text: '⬅️ Menú edición', callback_data: 'edit_client_back_to_menu' },
    { text: '🧹 Borrar', callback_data: `edit_client_clear_option:${type}` }
  ]);
  return rows;
}

async function sendEditOptionsPage(chatId, type, page = 0) {
  const column = type === 'category' ? 'category' : 'route';
  const options = await getDistinctValues(column);
  if (!options.length) {
    return bot.sendMessage(chatId, `No hay opciones de ${type === 'category' ? 'categoría' : 'ciudad'} registradas.`);
  }
  const inline_keyboard = buildEditOptionsKeyboard(options, page, type);
  const totalPages = Math.max(1, Math.ceil(options.length / OPTIONS_PAGE_SIZE));
  const titulo = type === 'category' ? 'Selecciona categoría' : 'Selecciona ciudad';
  return bot.sendMessage(chatId, `${titulo} — Página ${page + 1} de ${totalPages}`, { reply_markup: { inline_keyboard } });
}

function trunc(s, max) {
  if (!s) return '';
  const str = String(s);
  return str.length > max ? str.slice(0, Math.max(0, max - 1)) + '…' : str;
}

// --- Utilidades de carrito: resumen persistente ---
function cartTotal(cart) {
  return (cart || []).reduce((s, it) => s + (Number(it.qty || 0) * Number(it.price || 0)), 0);
}

function buildCartSummaryText(cart) {
  const list = cart || [];
  if (list.length === 0) {
    return '🛒 Carrito vacío. Escribe para buscar productos y añade con ➕\nTotal: $0.00';
  }
  const lines = list.map((it) => `• ${trunc(it.name, 24)} x${it.qty} = $${(it.qty * it.price).toFixed(2)}`);
  const total = cartTotal(list);
  return [
    '🛒 Carrito (resumen):',
    ...lines,
    `Total: $${total.toFixed(2)}`,
    '',
    '¿Deseas añadir más productos o confirmar el pedido?'
  ].join('\n');
}

function buildCartSummaryKeyboard() {
  return [
    [
      { text: '✅ Confirmar pedido', callback_data: 'confirm_cart' },
      { text: '🛒 Ver carrito', callback_data: 'view_cart' },
    ],
    [
      { text: '🧹 Vaciar', callback_data: 'clear_cart' },
      { text: '❌ Cancelar', callback_data: 'cancel_flow' }
    ]
  ];
}

async function showOrUpdateCartSummary(chatId, state) {
  try {
    const cart = state?.data?.cart || [];
    const text = buildCartSummaryText(cart);
    const inline_keyboard = buildCartSummaryKeyboard();
    const msgId = state?.data?.cart_summary_message_id;
    if (msgId) {
      try {
        await bot.editMessageText(text, {
          chat_id: chatId,
          message_id: msgId,
          reply_markup: { inline_keyboard }
        });
        return;
      } catch (e) {
        // Si falla (mensaje borrado u obsoleto), enviar uno nuevo
      }
    }
    const sent = await bot.sendMessage(chatId, text, { reply_markup: { inline_keyboard } });
    const st = userState.get(chatId) || state;
    if (st) {
      st.data = st.data || {};
      st.data.cart_summary_message_id = sent.message_id;
      userState.set(chatId, st);
    }
  } catch (e) {
    console.error('Error al actualizar resumen de carrito:', e);
  }
}

// --- Flujo guiado: Editar cliente ---
async function handleEditClientFlow(msg, state) {
  const chatId = msg.chat.id;
  const text = (msg.text || '').trim();
  if (!text || text.startsWith('/')) return; // ignorar comandos

  const keep = text === '!';
  const del = text === '-';
  const patch = state.data.patch || {};

  // Nuevo modo: edición por campo (texto)
  if (state.step === 'ask_field_text') {
    const field = state.data.field;
    if (field && ['nombre', 'contacto', 'direccion'].includes(field)) {
      if (!keep) {
        const value = del ? null : text.trim();
        if (field === 'nombre' && (value === null || value === '')) {
          return bot.sendMessage(chatId, 'El NOMBRE no puede quedar vacío. Escribe un valor o pulsa "⬅️ Menú edición" para volver.');
        }
        patch[field] = value;
      }
      state.data.patch = patch;
      state.step = 'menu';
      userState.set(chatId, state);
      return sendEditClientMenu(chatId, state);
    }
  }

  if (state.step === 'ask_nombre') {
    if (!keep) {
      const value = del ? null : text.trim();
      if (value === null || value === '') {
        return bot.sendMessage(chatId, 'El NOMBRE no puede quedar vacío. Escribe un valor (o "!" para mantener):');
      }
      patch.nombre = value;
    }
    state.data.patch = patch;
    state.step = 'ask_contacto';
    userState.set(chatId, state);
    return bot.sendMessage(chatId, 'Nuevo CONTACTO (o "!" para mantener, "-" para borrar):');
  }
  if (state.step === 'ask_contacto') {
    if (!keep) patch.contacto = del ? null : text.trim();
    state.data.patch = patch;
    userState.set(chatId, state);
    return bot.sendMessage(chatId, 'Nueva DIRECCIÓN (o "!" para mantener, "-" para borrar):');
  }
  if (state.step === 'ask_direccion') {
    if (!keep) patch.direccion = del ? null : text.trim();
    state.data.patch = patch;
    state.step = 'menu';
    userState.set(chatId, state);
    return sendEditClientMenu(chatId, state);
  }
}

// --- Flujo simple: Búsqueda de clientes (por categoría o ciudad) ---
async function handleSearchClientsFlow(msg, state) {
  const chatId = msg.chat.id;
  const text = (msg.text || '').trim();
  if (!text || text.startsWith('/')) return;
  try {
    let q = text;
    let sel;
    if (state.step === 'ask_category') {
      sel = supabase
        .from('clients')
        .select('id, nombre, contacto')
        .ilike('category', `%${q}%`)
        .order('nombre', { ascending: true })
        .limit(10);
    } else if (state.step === 'ask_city') {
      sel = supabase
        .from('clients')
        .select('id, nombre, contacto')
        .ilike('city', `%${q}%`)
        .order('nombre', { ascending: true })
        .limit(10);
    } else if (state.step === 'ask_text') {
      // Búsqueda libre con paginación
      await showClientResultsByText(chatId, q, 0);
      // Mantener el flujo para permitir nuevas búsquedas
      userState.set(chatId, state);
      return;
    } else {
      return; // paso desconocido
    }
    const { data: clients, error } = await sel;
    if (error) throw error;

    if (!clients || clients.length === 0) {
      await bot.sendMessage(chatId, 'Sin resultados. Intenta otro término o vuelve al submenú de búsqueda.');
      return;
    }

    const inline_keyboard = buildClientsListKeyboard(clients, 0, clients.length);
    const titulo = state.step === 'ask_category' ? `Resultados por categoría: "${q}"` : `Resultados por ciudad: "${q}"`;
    await bot.sendMessage(chatId, `${titulo}\nMostrando hasta ${clients.length} resultados. Toca un cliente para ver su ficha.`, {
      reply_markup: { inline_keyboard }
    });
    // Permitir nuevas búsquedas sin cambiar el flujo; el usuario puede escribir otro término
    userState.set(chatId, state);
  } catch (e) {
    console.error(e);
    await bot.sendMessage(chatId, 'Error en la búsqueda de clientes.');
  }
}

// --- Estado de interacción (eliminado - ya definido arriba) ---

// --- Helpers de UI y navegación (eliminado - ya definido arriba) ---

async function editOrSendFromQuery(query, text, inline_keyboard) {
  const chatId = query.message.chat.id;
  const message_id = query.message.message_id;
  try {
    await bot.editMessageText(text, {
      chat_id: chatId,
      message_id,
      reply_markup: { inline_keyboard }
    });
    return message_id;
  } catch (e) {
    // Si no se puede editar (mensaje antiguo/borrado), enviar uno nuevo
    const sent = await bot.sendMessage(chatId, text, { reply_markup: { inline_keyboard } });
    return sent.message_id;
  }
}

// --- Flujo simple: Inventario (búsqueda solo lectura / CRUD productos) ---
async function startInventoryFlow(chatId) {
  userState.set(chatId, { flow: 'inventory', step: 'ask_query', data: {} });
  await bot.sendMessage(chatId, 'Búsqueda de inventario. Escribe un término (ej.: "Patatine").');
}

async function handleInventoryFlow(msg, state) {
  const chatId = msg.chat.id;
  const text = (msg.text || '').trim();
  if (!text || text.startsWith('/')) return;
  try {
    const { products, total } = await db.searchProducts(text, 0);
    if (!products.length) {
      const inline_keyboard = [
        [
          { text: '⬅️ Volver', callback_data: 'cancel_flow' },
          { text: '🏠 Menú', callback_data: 'back:main' }
        ]
      ];
      return bot.sendMessage(chatId, 'Sin resultados. Intenta otro término.', { reply_markup: { inline_keyboard } });
    }
    const lines = products.map((p) => `• ${p.name} (SKU: ${p.external_id || 'N/A'}) — $${p.price ?? '0'} [${p.category || 'N/D'}]`);
    const inline_keyboard = [
      [
        { text: '⬅️ Volver', callback_data: 'cancel_flow' },
        { text: '🏠 Menú', callback_data: 'back:main' }
      ]
    ];
    await bot.sendMessage(chatId, `Resultados:\n${lines.join('\n')}`, { reply_markup: { inline_keyboard } });
    await bot.sendMessage(chatId, 'Puedes buscar otro término o usar los botones para regresar.');
  } catch (e) {
    console.error(e);
    await bot.sendMessage(chatId, 'Error en búsqueda de inventario.');
  }
}

// --- Alta de producto ---
async function startNewProductFlow(chatId) {
  userState.set(chatId, { flow: 'new_product', step: 'ask_data', data: {} });
  const ejemplo = 'Nombre producto | 12.50 | Snacks | ABC123 | 100 | Descripción opcional';
  await bot.sendMessage(
    chatId,
    `Alta de producto. Envía los datos separados por "|" en el siguiente orden:\n` +
      'nombre | precio | categoría | SKU | stock | descripción (opcional)\n' +
      `Ejemplo: ${ejemplo}`
  );
}

async function handleNewProductFlow(msg, state) {
  const chatId = msg.chat.id;
  const text = (msg.text || '').trim();
  if (!text || text.startsWith('/')) return;
  if (state.step !== 'ask_data') return;
  const parts = text.split('|').map((s) => s.trim());
  if (parts.length < 5) {
    return bot.sendMessage(chatId, 'Formato incorrecto. Debes proporcionar al menos 5 valores.');
  }
  const [name, priceStr, category, sku, stockStr, ...descArr] = parts;
  if (!name) return bot.sendMessage(chatId, 'El nombre es obligatorio.');
  const price = Number(priceStr.replace(',', '.'));
  if (isNaN(price) || price < 0) return bot.sendMessage(chatId, 'Precio inválido.');
  const stock = parseInt(stockStr, 10);
  if (isNaN(stock) || stock < 0) return bot.sendMessage(chatId, 'Stock inválido.');
  const description = descArr.join(' | ') || null;
  try {
    const { error } = await supabase.from('products').insert({
      name,
      price,
      category: category || null,
      external_id: sku || null,
      stock,
      description,
      source: 'Manual'
    });
    if (error) throw error;
    clearState(chatId);
    await bot.sendMessage(chatId, `Producto creado: ${name} (SKU: ${sku || 'N/A'})`);
    return sendInventoryMenu(chatId);
  } catch (e) {
    console.error(e);
    return bot.sendMessage(chatId, 'Error al crear producto.');
  }
}

async function sendMainMenu(chatId) {
  const inline_keyboard = [
    [
      { text: 'Gestión Cliente', callback_data: 'menu:clients' },
      { text: 'Gestión Ventas', callback_data: 'menu:sales' }
    ],
    [
      { text: 'Gestión Inventario', callback_data: 'menu:inventory' },
      { text: 'Cerrar sesión', callback_data: 'menu:logout' }
    ]
  ];
  // Asegurar que se remueve cualquier teclado previo sin provocar error 400 (texto vacío)
  try {
    const rm = await bot.sendMessage(chatId, 'Ocultando teclado…', { reply_markup: { remove_keyboard: true } });
    // Borrar el mensaje de ocultación para mantener el chat limpio (ignorar errores)
    try { await bot.deleteMessage(chatId, rm.message_id); } catch (_) {}
  } catch (e) {
    // Ignorar si falla; continuamos mostrando el menú inline
    console.warn('No se pudo enviar mensaje de remove_keyboard:', e?.message || e);
  }
  return bot.sendMessage(chatId, 'Menú principal:', { reply_markup: { inline_keyboard } });
}

function getClientsMenuKeyboard() {
  return [
    [
      { text: '📋 Listar clientes', callback_data: 'clients:view' },
      { text: '🔎 Buscar cliente', callback_data: 'clients:search' }
    ],
    [
      { text: '➕ Añadir cliente', callback_data: 'clients:add' }
    ],
    [
      { text: '⬅️ Menú principal', callback_data: 'back:main' }
    ]
  ];
}

function sendClientsMenu(chatId) {
  const inline_keyboard = getClientsMenuKeyboard();
  return bot.sendMessage(chatId, 'Gestión de clientes:', { reply_markup: { inline_keyboard } });
}

function sendClientsSearchMenu(chatId) {
  // Menú de búsqueda con 2 botones por fila (preferencia del usuario)
  const inline_keyboard = [
    [
      { text: 'Por categoría', callback_data: 'clients:search:category' },
      { text: 'Por ruta', callback_data: 'clients:search:route' }
    ],
    [
      { text: 'Por ciudad', callback_data: 'clients:search:city' },
      { text: 'Por texto', callback_data: 'clients:search:text' }
    ],
    [
      { text: '⬅️ Menú Clientes', callback_data: 'back:clients' }
    ]
  ];
  return bot.sendMessage(chatId, 'Buscar cliente:', { reply_markup: { inline_keyboard } });
}

// Obtiene valores distintos de una columna de clients (paginación en memoria)
async function getDistinctValues(column) {
  const { data, error } = await supabase
    .from('clients')
    .select(column)
    .not(column, 'is', null)
    .neq(column, '')
    .order(column, { ascending: true });
  if (error) throw error;
  const set = new Set((data || []).map((r) => String(r[column]).trim()).filter(Boolean));
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
}

// Devuelve string encodeURIComponent(o) truncado para que (prefix + result) <= 63 bytes
function safeEncodeCb(prefix, rawValue) {
  const LIMIT = 63; // Telegram permite 64, usamos 63 para margen
  let sliceLen = rawValue.length;
  let encoded = encodeURIComponent(rawValue);
  while ((prefix.length + encoded.length) > LIMIT && sliceLen > 1) {
    sliceLen = Math.floor(sliceLen * 0.8); // recorta 20% y reintenta
    encoded = encodeURIComponent(rawValue.slice(0, sliceLen));
  }
  return encoded;
}

function buildOptionsKeyboard(options, page, type) {
  const rows = [];
  const from = page * OPTIONS_PAGE_SIZE;
  const to = from + OPTIONS_PAGE_SIZE;
  const pageItems = options.slice(from, to);
  for (let i = 0; i < pageItems.length; i += 2) {
    const o1 = pageItems[i];
    const o2 = pageItems[i + 1];
    const prefix = `clients_search_select:${type}:`;
    let encoded1 = safeEncodeCb(prefix, o1);
    const row = [
      { text: trunc(o1, 24), callback_data: `${prefix}${encoded1}` }
    ];
    if (o2) {
      let encoded2 = safeEncodeCb(prefix, o2);
      row.push({ text: trunc(o2, 24), callback_data: `${prefix}${encoded2}` });
    }
    rows.push(row);
  }
  const totalPages = Math.max(1, Math.ceil(options.length / OPTIONS_PAGE_SIZE));
  const hasPrev = page > 0;
  const hasNext = page + 1 < totalPages;
  if (hasPrev || hasNext) {
    const nav1 = [];
    if (hasPrev) {
      nav1.push({ text: '⏮️ Primera', callback_data: `clients_search_options_page:${type}:0` });
      nav1.push({ text: '◀️ Anterior', callback_data: `clients_search_options_page:${type}:${page - 1}` });
    }
    if (nav1.length) rows.push(nav1);
    const nav2 = [];
    if (hasNext) {
      const last = totalPages - 1;
      nav2.push({ text: 'Siguiente ▶️', callback_data: `clients_search_options_page:${type}:${page + 1}` });
      nav2.push({ text: 'Última ⏭️', callback_data: `clients_search_options_page:${type}:${last}` });
    }
    if (nav2.length) rows.push(nav2);
  }
  rows.push([
    { text: '⬅️ Filtros', callback_data: 'clients:search' },
    { text: '🏠 Menú Principal', callback_data: 'back:main' }
  ]);
  return rows;
}

async function sendCategoryOptionsPage(chatId, page = 0) {
  const options = await getDistinctValues('category');
  if (!options.length) {
    return bot.sendMessage(chatId, 'No hay categorías registradas.');
  }
  const inline_keyboard = buildOptionsKeyboard(options, page, 'category');
  const totalPages = Math.max(1, Math.ceil(options.length / OPTIONS_PAGE_SIZE));
  return bot.sendMessage(chatId, `Categorías — Página ${page + 1} de ${totalPages}`, { reply_markup: { inline_keyboard } });
}

async function sendCityOptionsPage(chatId, page = 0) {
  // Nota: usamos la columna 'route' como ciudad en la base de datos
  const options = await getDistinctValues('route');
  if (!options.length) {
    return bot.sendMessage(chatId, 'No hay ciudades registradas.');
  }
  const inline_keyboard = buildOptionsKeyboard(options, page, 'city');
  const totalPages = Math.max(1, Math.ceil(options.length / OPTIONS_PAGE_SIZE));
  return bot.sendMessage(chatId, `Ciudades — Página ${page + 1} de ${totalPages}`, { reply_markup: { inline_keyboard } });
}

// Lista de rutas (campo "route")
async function sendRouteOptionsPage(chatId, page = 0) {
  const options = await getDistinctValues('route');
  if (!options.length) {
    return bot.sendMessage(chatId, 'No hay rutas registradas.');
  }
  const inline_keyboard = buildOptionsKeyboard(options, page, 'route');
  const totalPages = Math.max(1, Math.ceil(options.length / OPTIONS_PAGE_SIZE));
  return bot.sendMessage(chatId, `Rutas — Página ${page + 1} de ${totalPages}`, { reply_markup: { inline_keyboard } });
}

// --- Opciones paginadas para flujo de NUEVO cliente (categoría/ciudad) ---
function buildNewClientOptionsKeyboard(options, page, type) {
  const rows = [];
  // Categorías fijas siempre visibles (antes de la paginación)
  if (type === 'category') {
    const fixed = [
      'Bar',
      'Tabacheria',
      'restaurante/hotel',
      'cinema/teatro',
      'piscinas',
      'estacional',
    ];
    for (let i = 0; i < fixed.length; i += 2) {
      const f1 = fixed[i];
      const f2 = fixed[i + 1];
      const row = [
        { text: trunc(f1, 24), callback_data: `new_client_select_option:category:${encodeURIComponent(f1)}` }
      ];
      if (f2) row.push({ text: trunc(f2, 24), callback_data: `new_client_select_option:category:${encodeURIComponent(f2)}` });
      rows.push(row);
    }
    // Entrada manual de categoría
    rows.push([
      { text: '✍️ Escribir categoría', callback_data: 'new_client_category_enter_text' }
    ]);
  }
  const from = page * OPTIONS_PAGE_SIZE;
  const to = from + OPTIONS_PAGE_SIZE;
  const pageItems = options.slice(from, to);
  for (let i = 0; i < pageItems.length; i += 2) {
    const o1 = pageItems[i];
    const o2 = pageItems[i + 1];
    const row = [
      { text: trunc(o1, 24), callback_data: `new_client_select_option:${type}:${encodeURIComponent(o1)}` }
    ];
    if (o2) row.push({ text: trunc(o2, 24), callback_data: `new_client_select_option:${type}:${encodeURIComponent(o2)}` });
    rows.push(row);
  }
  const totalPages = Math.max(1, Math.ceil(options.length / OPTIONS_PAGE_SIZE));
  const hasPrev = page > 0;
  const hasNext = page + 1 < totalPages;
  if (hasPrev || hasNext) {
    const nav1 = [];
    if (hasPrev) {
      nav1.push({ text: '⏮️ Primera', callback_data: `new_client_options_page:${type}:0` });
      nav1.push({ text: '◀️ Anterior', callback_data: `new_client_options_page:${type}:${page - 1}` });
    }
    if (nav1.length) rows.push(nav1);
    const nav2 = [];
    if (hasNext) {
      const last = totalPages - 1;
      nav2.push({ text: 'Siguiente ▶️', callback_data: `new_client_options_page:${type}:${page + 1}` });
      nav2.push({ text: 'Última ⏭️', callback_data: `new_client_options_page:${type}:${last}` });
    }
    if (nav2.length) rows.push(nav2);
  }
  rows.push([
    { text: '⏭️ Omitir', callback_data: `new_client_skip_option:${type}` },
    { text: '❌ Cancelar', callback_data: 'cancel_flow' }
  ]);
  return rows;
}

async function sendNewClientOptionsPage(chatId, type, page = 0) {
  const column = type === 'category' ? 'category' : 'route';
  const options = await getDistinctValues(column);
  if (!options.length) {
    // Si no hay opciones, ofrecer omitir directamente
    const kb = [[
      { text: '⏭️ Omitir', callback_data: `new_client_skip_option:${type}` },
      { text: '❌ Cancelar', callback_data: 'cancel_flow' }
    ]];
    return bot.sendMessage(chatId, `No hay opciones de ${type === 'category' ? 'categoría' : 'ciudad'} registradas.`, {
      reply_markup: { inline_keyboard: kb }
    });
  }
  const inline_keyboard = buildNewClientOptionsKeyboard(options, page, type);
  const totalPages = Math.max(1, Math.ceil(options.length / OPTIONS_PAGE_SIZE));
  const titulo = type === 'category' ? 'Selecciona categoría' : 'Selecciona ciudad';
  return bot.sendMessage(chatId, `${titulo} — Página ${page + 1} de ${totalPages}`, { reply_markup: { inline_keyboard } });
}

function buildClientsListKeyboardWithPrefix(clients, page, count, cbPrefix) {
  const rows = [];
  const list = clients || [];
  for (let i = 0; i < list.length; i += 2) {
    const c1 = list[i];
    const c2 = list[i + 1];
    const btn1Label = `${trunc(c1?.nombre || 'N/D', 22)}${c1?.contacto ? ' · ' + trunc(c1.contacto, 20) : ''}`;
    const row = [
      { text: btn1Label, callback_data: `client:show:${c1.id}` },
    ];
    if (c2) {
      const btn2Label = `${trunc(c2?.nombre || 'N/D', 22)}${c2?.contacto ? ' · ' + trunc(c2.contacto, 20) : ''}`;
      row.push({ text: btn2Label, callback_data: `client:show:${c2.id}` });
    }
    rows.push(row);
  }
  const total = count || 0;
  const totalPages = Math.max(1, Math.ceil(total / CLIENTS_PAGE_SIZE));
  const hasPrev = page > 0;
  const hasNext = page + 1 < totalPages;
  const lastPage = Math.max(0, totalPages - 1);
  if (hasPrev || hasNext) {
    const navRows = [];
    const navRow1 = [];
    if (hasPrev) {
      navRow1.push({ text: '⏮️ Primera', callback_data: `${cbPrefix}0` });
      navRow1.push({ text: '◀️ Anterior', callback_data: `${cbPrefix}${page - 1}` });
    }
    if (navRow1.length) navRows.push(navRow1);
    const navRow2 = [];
    if (hasNext) {
      navRow2.push({ text: 'Siguiente ▶️', callback_data: `${cbPrefix}${page + 1}` });
      navRow2.push({ text: 'Última ⏭️', callback_data: `${cbPrefix}${lastPage}` });
    }
    if (navRow2.length) navRows.push(navRow2);
    rows.push(...navRows);
  }
  rows.push([
    { text: '⬅️ Filtros', callback_data: 'clients:search' },
    { text: '🏠 Menú Principal', callback_data: 'back:main' }
  ]);
  return rows;
}

async function showClientResultsFiltered(chatId, type, value, page = 0) {
  let col;
  if (type === 'category') col = 'category';
  else if (type === 'route') col = 'route';
  else if (type === 'city') col = 'route';
  else col = 'route'; // Fallback
  const from = page * CLIENTS_PAGE_SIZE;
  const to = from + CLIENTS_PAGE_SIZE - 1;
  let selFiltered = supabase
    .from('clients')
    .select('id, nombre, contacto', { count: 'exact' });
  if (type === 'city') {
    selFiltered = selFiltered.ilike(col, `%${value}%`);
  } else {
    selFiltered = selFiltered.eq(col, value);
  }
  selFiltered = selFiltered.order('nombre', { ascending: true });
  const { data: clients, count, error } = await selFiltered
    .range(from, to);
  if (error) throw error;
  const total = count || 0;
  const inline_keyboard = buildClientsListKeyboardWithPrefix(
    clients || [],
    page,
    total,
    (() => {
      const base = `clients_search_results_page:${type}:`;
      const enc = safeEncodeCb(base, value);
      return `${base}${enc}:`;
    })()
  );
  const totalPages = Math.max(1, Math.ceil(total / CLIENTS_PAGE_SIZE));
  let titulo;
  if (type === 'category') titulo = `Clientes por categoría: "${value}"`;
  else if (type === 'route') titulo = `Clientes por ruta: "${value}"`;
  else titulo = `Clientes por ciudad: "${value}"`;
  const texto = (clients && clients.length)
    ? `${titulo} — Total: ${total}\nPágina ${page + 1} de ${totalPages}\nToca un cliente para ver su ficha`
    : `${titulo} — Sin resultados en esta página.`;
  return bot.sendMessage(chatId, texto, { reply_markup: { inline_keyboard } });
}

function sendSalesMenu(chatId) {
  // Menú principal de ventas: 2 botones por fila
  const inline_keyboard = [
    [
      { text: 'Nueva venta', callback_data: 'sales:new_order' },
      { text: 'Consultar ventas', callback_data: 'sales:view_orders' }
    ],
    [
      { text: '⬅️ Volver', callback_data: 'back:main' }
    ]
  ];
  return bot.sendMessage(chatId, 'Gestión de ventas:', { reply_markup: { inline_keyboard } });
}

// --- Submenú Consultar ventas ---
function sendSalesConsultMenu(chatId) {
  const inline_keyboard = [
    [
      { text: 'Por fecha 📅', callback_data: 'sales:by_date' },
      { text: 'Por cliente 🧾', callback_data: 'sales:by_client' }
    ],
    [
      { text: '⬅️ Menú Ventas', callback_data: 'menu:sales' },
      { text: '🏠 Menú Principal', callback_data: 'back:main' }
    ]
  ];
  return bot.sendMessage(chatId, 'Consultar ventas:', { reply_markup: { inline_keyboard } });
}

function sendInventoryMenu(chatId) {
  const inline_keyboard = [
    [
      { text: '🔎 Buscar producto', callback_data: 'inventory:search' },
      { text: '➕ Añadir producto', callback_data: 'inventory:add' }
    ],
    [
      { text: '✏️ Modificar producto', callback_data: 'inventory:edit' },
      { text: '🗑️ Eliminar producto', callback_data: 'inventory:delete' }
    ],
    [
      { text: '⬅️ Volver', callback_data: 'back:main' }
    ]
  ];
  return bot.sendMessage(chatId, 'Gestión de inventario:', { reply_markup: { inline_keyboard } });
}

function clearState(chatId) {
  userState.delete(chatId);
}

// Ocultar botón inferior "Menu" (lista de comandos) desactivando comandos globales
bot.setMyCommands([]);

function parseArgs(text) {
  // Espera formato: comando arg1 | arg2 | arg3
  const idx = text.indexOf(' ');
  if (idx === -1) return [];
  return text
    .slice(idx + 1)
    .split('|')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function buildClientsKeyboard(clients, page, count) {
  const rows = clients.map((c) => [{ text: c.nombre, callback_data: `select_client:${c.id}` }]);
  const hasPrev = page > 0;
  const hasNext = (page + 1) * PAGE_SIZE < (count || 0);
  const nav = [];
  if (hasPrev) nav.push({ text: '◀️ Anterior', callback_data: `clients_page:${page - 1}` });
  if (hasNext) nav.push({ text: 'Siguiente ▶️', callback_data: `clients_page:${page + 1}` });
  if (nav.length) rows.push(nav);
  return rows;
}

// Teclado de resultados de clientes para selección en flujo de venta (2 por fila) con paginación custom
function buildClientsSelectKeyboardWithPrefix(clients, page, count, cbPrefix) {
  const rows = [];
  const list = clients || [];
  for (let i = 0; i < list.length; i += 2) {
    const c1 = list[i];
    const c2 = list[i + 1];
    const btn1Label = `${trunc(c1?.nombre || 'N/D', 22)}${c1?.contacto ? ' · ' + trunc(c1.contacto, 20) : ''}`;
    const row = [
      { text: btn1Label, callback_data: `select_client:${c1.id}` },
    ];
    if (c2) {
      const btn2Label = `${trunc(c2?.nombre || 'N/D', 22)}${c2?.contacto ? ' · ' + trunc(c2.contacto, 20) : ''}`;
      row.push({ text: btn2Label, callback_data: `select_client:${c2.id}` });
    }
    rows.push(row);
  }
  const hasPrev = page > 0;
  const hasNext = (page + 1) * CLIENTS_PAGE_SIZE < (count || 0);
  if (hasPrev || hasNext) {
    const totalPages = Math.max(1, Math.ceil((count || 0) / CLIENTS_PAGE_SIZE));
    const lastPage = totalPages - 1;
    const navRow1 = [];
    if (hasPrev) {
      navRow1.push({ text: '⏮️ Primera', callback_data: `${cbPrefix}0` });
      navRow1.push({ text: '◀️ Anterior', callback_data: `${cbPrefix}${page - 1}` });
    }
    if (navRow1.length) rows.push(navRow1);
    const navRow2 = [];
    if (hasNext) {
      navRow2.push({ text: 'Siguiente ▶️', callback_data: `${cbPrefix}${page + 1}` });
      navRow2.push({ text: 'Última ⏭️', callback_data: `${cbPrefix}${lastPage}` });
    }
    if (navRow2.length) rows.push(navRow2);
  }
  rows.push([
    { text: '❌ Cancelar', callback_data: 'cancel_flow' },
    { text: '⬅️ Menú', callback_data: 'back:main' }
  ]);
  return rows;
}

async function searchProducts(query, page = 0) {
  const { products, total } = await db.searchProducts(query, page, PAGE_SIZE);
  return { products: products || [], total: total || 0 };
}

async function ensureUserByTelegram(msg) {
  const tgId = String(msg.from.id);
  const nombre = [msg.from.first_name, msg.from.last_name].filter(Boolean).join(' ').trim() || null;

  const { data: existing, error: selErr } = await supabase
    .from('users')
    .select('id, nombre')
    .eq('telegram_id', tgId)
    .maybeSingle();
  if (selErr) throw selErr;
  if (existing) return existing;

  const { data: inserted, error: insErr } = await supabase
    .from('users')
    .insert({ telegram_id: tgId, nombre, rol: 'vendedor' })
    .select('id, nombre')
    .single();
  if (insErr) throw insErr;
  return inserted;
}

// === COMANDOS ELIMINADOS ===
// Los comandos bot.onText se han movido a src/bot/handlers/commands.js
// y se registran automáticamente en initializeBot()

async function sendRecentOrdersPage(chatId, page = 0) {
  try {
    // Intentar usar la vista optimizada con short_code
    let orders = [];
    let count = 0;
    let error = null;
    try {
      const resView = await supabase
        .from('orders_with_short_code')
        .select('id, total, fecha, created_at, short_code', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * ORDERS_PAGE_SIZE, page * ORDERS_PAGE_SIZE + ORDERS_PAGE_SIZE - 1);
      orders = resView.data || [];
      count = resView.count || 0;
      error = resView.error || null;
    } catch (e) {
      error = e;
    }
    // Fallback a la tabla si la vista no existe
    const usedView = !error;
    if (error) {
      const resTbl = await supabase
        .from('orders')
        .select('id, total, fecha, created_at', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * ORDERS_PAGE_SIZE, page * ORDERS_PAGE_SIZE + ORDERS_PAGE_SIZE - 1);
      if (resTbl.error) throw resTbl.error;
      orders = resTbl.data || [];
      count = resTbl.count || 0;
    }

    // Normalizar shortCode desde short_code si viene de la vista; si no hay vista, calcularlo
    const enriched = [];
    for (const o of (orders || [])) {
      if (usedView && (o.short_code || o.shortCode)) {
        enriched.push({ ...o, shortCode: o.shortCode || o.short_code });
      } else {
        // Cálculo de respaldo en cliente
        let shortCode = String(o.id);
        try {
          const baseDate = o.fecha || (o.created_at ? o.created_at.slice(0, 10) : null);
          if (baseDate && o.created_at) {
            const d = new Date(baseDate);
            const dd = d.getDate();
            const mm = d.getMonth() + 1;
            const yyyy = d.getFullYear();
            const { count: seqCount } = await supabase
              .from('orders')
              .select('id', { count: 'exact', head: true })
              .eq('fecha', baseDate)
              .lte('created_at', o.created_at);
            const seq = (seqCount || 1);
            shortCode = `${dd}/${mm}.${yyyy}-${seq}`;
          }
        } catch (_) { /* noop */ }
        enriched.push({ ...o, shortCode });
      }
    }

    const total_count = count || 0;
    const inline_keyboard = buildOrdersListKeyboard(enriched, page, total_count);

    const texto = (orders && orders.length)
      ? `Pedidos recientes — Total: ${total_count}\nPágina ${page + 1} de ${Math.ceil(total_count / ORDERS_PAGE_SIZE)}`
      : 'No hay pedidos registrados.';
    
    return bot.sendMessage(chatId, texto, { reply_markup: { inline_keyboard } });
  } catch (e) {
    console.error(e);
    return bot.sendMessage(chatId, 'Error al cargar pedidos.');
  }
}

async function clearState(chatId) {
  userState.delete(chatId);
}

async function sendMainMenu(chatId) {
  const keyboard = keyboards.getMainMenuKeyboard();
  
  return bot.sendMessage(chatId, '¿Qué deseas hacer?', { reply_markup: { inline_keyboard: keyboard } });
}

// === FUNCIONES DE UTILIDAD ===

function createKeyboard(buttons) {
  return keyboards.getMainMenuKeyboard();
}

function buildOrdersListKeyboard(orders, page, total) {
  return keyboards.buildOrdersListKeyboard(orders, page, total);
}

function fmtDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('es-ES');
}

// === FUNCIONES DE FLUJOS ===

async function ensureUserByTelegram(msg) {
  const tgId = String(msg.from.id);
  const nombre = [msg.from.first_name, msg.from.last_name].filter(Boolean).join(' ').trim() || null;

  const { data: existing, error: selErr } = await supabase
    .from('users')
    .select('id, nombre')
    .eq('telegram_id', tgId)
    .maybeSingle();
  if (selErr) throw selErr;
  if (existing) return existing;

  const { data: inserted, error: insErr } = await supabase
    .from('users')
    .insert({ telegram_id: tgId, nombre, rol: 'vendedor' })
    .select('id, nombre')
    .single();
  if (insErr) throw insErr;
  return inserted;
}

// === STUBS DE FLUJOS FALTANTES Y FUNCIONES AUXILIARES ===

// Flujo: Nuevo cliente (mínimo viable)
async function startNewClientFlow(chatId) {
  const st = { flow: 'new_client', step: 'ask_nombre', data: {} };
  userState.set(chatId, st);
  await bot.sendMessage(chatId, 'Alta de cliente. Escribe el NOMBRE del cliente:');
}

async function handleNewClientFlow(msg, state) {
  const chatId = msg.chat.id;
  const text = (msg.text || '').trim();
  if (!text || text.startsWith('/')) return;

  try {
    if (state.step === 'ask_nombre') {
      if (!text) {
        return bot.sendMessage(chatId, 'El nombre no puede estar vacío. Escribe el NOMBRE del cliente:');
      }
      state.data.nombre = text;
      state.step = 'ask_contacto';
      userState.set(chatId, state);
      return bot.sendMessage(chatId, 'Contacto (teléfono/email) — opcional. Escribe "-" para omitir:');
    }

    if (state.step === 'ask_contacto') {
      state.data.contacto = text === '-' ? null : text;
      state.step = 'ask_direccion';
      userState.set(chatId, state);
      return bot.sendMessage(chatId, 'Dirección — opcional. Escribe "-" para omitir:');
    }

    if (state.step === 'ask_direccion') {
      state.data.direccion = text === '-' ? null : text;

      // Insertar en BD
      const user = await ensureUserByTelegram(msg);
      const payload = {
        nombre: state.data.nombre,
        contacto: state.data.contacto ?? null,
        direccion: state.data.direccion ?? null,
        usuario_responsable_id: user.id
      };

      const { data: inserted, error } = await supabase
        .from('clients')
        .insert(payload)
        .select('id, nombre')
        .single();
      if (error) throw error;

      clearState(chatId);
      await bot.sendMessage(chatId, `Cliente creado: ${inserted.nombre} (ID: ${inserted.id})`);
      return sendClientsMenu(chatId);
    }
  } catch (e) {
    console.error('handleNewClientFlow error:', e);
    return bot.sendMessage(chatId, 'Error al procesar alta de cliente. Intenta nuevamente.');
  }
}

// Flujo: Nuevo pedido (guiado mínimo, sin carrito)
async function startNewOrderFlow(msg) {
  const chatId = msg.chat.id;
  // Aseguramos que el usuario existe (ignorar resultado)
  try { await ensureUserByTelegram(msg); } catch (_) {}
  const st = { flow: 'new_order', step: 'ask_client_id', data: {} };
  userState.set(chatId, st);
  await bot.sendMessage(chatId, 'Nueva venta. Ingresa el ID del cliente (número):');
}

async function handleNewOrderFlow(msg, state) {
  const chatId = msg.chat.id;
  const text = (msg.text || '').trim();
  if (!text || text.startsWith('/')) return;

  try {
    if (state.step === 'ask_client_id') {
      const id = parseInt(text, 10);
      if (isNaN(id)) {
        return bot.sendMessage(chatId, 'ID inválido. Ingresa un número de cliente válido:');
      }
      const { data: client, error } = await supabase
        .from('clients')
        .select('id, nombre')
        .eq('id', id)
        .single();
      if (error || !client) {
        return bot.sendMessage(chatId, `Cliente con ID ${id} no encontrado. Ingresa otro ID:`);
      }
      state.data.cliente_id = client.id;
      state.data.cliente_nombre = client.nombre;
      state.step = 'ask_total';
      userState.set(chatId, state);
      return bot.sendMessage(chatId, `Cliente: ${client.nombre}\nIngresa el TOTAL (ej.: 45.50):`);
    }

    if (state.step === 'ask_total') {
      const total = Number(text.replace(',', '.'));
      if (!isFinite(total) || total < 0) {
        return bot.sendMessage(chatId, 'Total inválido. Ingresa un monto válido (ej.: 45.50):');
      }
      state.data.total = total;
      state.step = 'ask_notes';
      userState.set(chatId, state);
      return bot.sendMessage(chatId, 'Notas (opcional). Escribe "-" para ninguna:');
    }

    if (state.step === 'ask_notes') {
      const notas = text === '-' ? null : text;
      const user = await ensureUserByTelegram(msg);
      const today = new Date().toISOString().slice(0, 10);
      const payload = {
        cliente_id: state.data.cliente_id,
        total: state.data.total,
        estado: 'pendiente',
        notas,
        usuario_responsable_id: user.id,
        fecha: today
      };
      const { data: order, error } = await supabase
        .from('orders')
        .insert(payload)
        .select('id, total, estado')
        .single();
      if (error) throw error;
      clearState(chatId);
      await bot.sendMessage(
        chatId,
        `Pedido creado: #${order.id} para ${state.data.cliente_nombre}\nTotal: $${Number(order.total).toFixed(2)} | Estado: ${order.estado}`
      );
      return sendSalesMenu(chatId);
    }
  } catch (e) {
    console.error('handleNewOrderFlow error:', e);
    return bot.sendMessage(chatId, 'Error al crear pedido. Intenta nuevamente.');
  }
}

// Ventas por fecha: listador con teclado por fecha
async function sendOrdersByDatePage(chatId, dateStr, page = 0) {
  try {
    const from = page * ORDERS_PAGE_SIZE;
    const to = from + ORDERS_PAGE_SIZE - 1;
    // Intentar vista optimizada
    let orders = [];
    let count = 0;
    let error = null;
    try {
      const resView = await supabase
        .from('orders_with_short_code')
        .select('id, total, fecha, created_at, short_code', { count: 'exact' })
        .eq('fecha', dateStr)
        .order('id', { ascending: false })
        .range(from, to);
      orders = resView.data || [];
      count = resView.count || 0;
      error = resView.error || null;
    } catch (e) {
      error = e;
    }
    const usedView = !error;
    if (error) {
      const resTbl = await supabase
        .from('orders')
        .select('id, total, fecha, created_at', { count: 'exact' })
        .eq('fecha', dateStr)
        .order('id', { ascending: false })
        .range(from, to);
      if (resTbl.error) throw resTbl.error;
      orders = resTbl.data || [];
      count = resTbl.count || 0;
    }

    const enriched = [];
    for (const o of (orders || [])) {
      if (usedView && (o.short_code || o.shortCode)) {
        enriched.push({ ...o, shortCode: o.shortCode || o.short_code });
      } else {
        // Cálculo de respaldo en cliente
        let shortCode = String(o.id);
        try {
          const baseDate = o.fecha || (o.created_at ? o.created_at.slice(0, 10) : null);
          if (baseDate && o.created_at) {
            const d = new Date(baseDate);
            const dd = d.getDate();
            const mm = d.getMonth() + 1;
            const yyyy = d.getFullYear();
            const { count: seqCount } = await supabase
              .from('orders')
              .select('id', { count: 'exact', head: true })
              .eq('fecha', baseDate)
              .lte('created_at', o.created_at);
            const seq = (seqCount || 1);
            shortCode = `${dd}/${mm}.${yyyy}-${seq}`;
          }
        } catch (_) { /* noop */ }
        enriched.push({ ...o, shortCode });
      }
    }

    const inline_keyboard = keyboards.buildOrdersByDateKeyboard(enriched, page, count || 0, dateStr);
    const total = count || 0;
    const totalPages = Math.max(1, Math.ceil(total / ORDERS_PAGE_SIZE));
    const texto = total
      ? `Ventas del ${dateStr} — Total: ${total}\nPágina ${page + 1} de ${totalPages}`
      : `Sin ventas registradas para ${dateStr}.`;
    return bot.sendMessage(chatId, texto, { reply_markup: { inline_keyboard } });
  } catch (e) {
    console.error('sendOrdersByDatePage error:', e);
    return bot.sendMessage(chatId, 'Error al listar ventas por fecha.');
  }
}

// Listado de clientes para consultar sus ventas (submenú de ventas)
async function sendClientsOrdersPage(chatId, page = 0) {
  try {
    const PAGE = CLIENTS_PAGE_SIZE;
    const from = page * PAGE;
    const to = from + PAGE - 1;

    // Intentar mostrar primero clientes del usuario; si no hay, mostrar todos
    const tgId = String(chatId); // no tenemos msg; usaremos consulta separada con user via telegram_id en callbacks
    // Recuperar usuario por callback no es posible aquí; mostramos todos para simplificar
    const { data: clients, count, error } = await supabase
      .from('clients')
      .select('id, nombre, contacto', { count: 'exact' })
      .order('nombre', { ascending: true })
      .range(from, to);
    if (error) throw error;

    const inline_keyboard = keyboards.buildClientsOrdersListKeyboard(clients || [], page, count || 0);
    const total = count || 0;
    const totalPages = Math.max(1, Math.ceil(total / PAGE));
    const texto = total
      ? `Selecciona un cliente — Total: ${total}\nPágina ${page + 1} de ${totalPages}`
      : 'No hay clientes para mostrar.';
    return bot.sendMessage(chatId, texto, { reply_markup: { inline_keyboard } });
  } catch (e) {
    console.error('sendClientsOrdersPage error:', e);
    return bot.sendMessage(chatId, 'Error al listar clientes.');
  }
}

// Búsqueda rápida de clientes para selección (por texto)
async function searchClientsForSelection(chatId, term, page = 0) {
  try {
    const like = `%${(term || '').trim()}%`;
    const from = page * CLIENTS_PAGE_SIZE;
    const to = from + CLIENTS_PAGE_SIZE - 1;
    const { data: clients, count, error } = await supabase
      .from('clients')
      .select('id, nombre, contacto', { count: 'exact' })
      .or(`nombre.ilike.${like},contacto.ilike.${like},direccion.ilike.${like}`)
      .order('nombre', { ascending: true })
      .range(from, to);
    if (error) throw error;

    const inline_keyboard = keyboards.buildClientsQuickSearchKeyboard(clients || [], page, count || 0, term || '');
    const total = count || 0;
    const totalPages = Math.max(1, Math.ceil(total / CLIENTS_PAGE_SIZE));
    const titulo = `Resultados de "${term || ''}"`;
    const texto = total
      ? `${titulo} — Total: ${total}\nPágina ${page + 1} de ${totalPages}`
      : `${titulo} — Sin coincidencias.`;
    return bot.sendMessage(chatId, texto, { reply_markup: { inline_keyboard } });
  } catch (e) {
    console.error('searchClientsForSelection error:', e);
    return bot.sendMessage(chatId, 'Error al buscar clientes.');
  }
}

// === INICIALIZACIÓN DE MÓDULOS ===

// Crear objeto de dependencias para los handlers
const dependencies = {
  bot,
  supabase,
  userState,
  
  // Utilidades básicas
  fmtDate,
  trunc,
  clearState,
  ensureState,
  
  // Funciones de menú (se definirán más adelante)
  sendMainMenu: null,
  sendClientsMenu: null,
  sendInventoryMenu: null,
  sendSalesMenu: null,
  sendSalesConsultMenu: null,
  
  // Funciones de flujo (se definirán más adelante)
  startNewClientFlow: null,
  startNewOrderFlow: null,
  startNewProductFlow: null,
  startInventoryFlow: null,
  
  // Funciones específicas (se definirán más adelante)
  ensureUserByTelegram: null,
  sendRecentOrdersPage: null,
  handleNewClientFlow: null,
  handleNewOrderFlow: null,
  handleNewProductFlow: null,
  handleInventoryFlow: null,
  handleSearchClientsFlow: null,
  handleEditClientFlow: null,
  sendOrdersByDatePage: null,
  editOrSendFromQuery: null,
  sendNewClientOptionsPage: null,
  sendClientsSearchMenu: null,
  sendCategoryOptionsPage: null,
  sendRouteOptionsPage: null,
  sendCityOptionsPage: null,
  showClientResultsFiltered: null,
  showClientResultsByText: null,
  sendClientsOrdersPage: null,
  searchClientsForSelection: null,
  showOrUpdateCartSummary: null,
  sendEditClientMenu: null
};

// Función para actualizar dependencias después de definir las funciones
function updateDependencies() {
  // Actualizar funciones de menú
  dependencies.sendMainMenu = sendMainMenu;
  dependencies.sendClientsMenu = sendClientsMenu;
  dependencies.sendInventoryMenu = sendInventoryMenu;
  dependencies.sendSalesMenu = sendSalesMenu;
  dependencies.sendSalesConsultMenu = sendSalesConsultMenu;
  
  // Actualizar funciones de flujo
  dependencies.startNewClientFlow = startNewClientFlow;
  dependencies.startNewOrderFlow = startNewOrderFlow;
  dependencies.startNewProductFlow = startNewProductFlow;
  dependencies.startInventoryFlow = startInventoryFlow;
  
  // Actualizar funciones específicas
  dependencies.ensureUserByTelegram = ensureUserByTelegram;
  dependencies.sendRecentOrdersPage = sendRecentOrdersPage;
  dependencies.handleNewClientFlow = handleNewClientFlow;
  dependencies.handleNewOrderFlow = handleNewOrderFlow;
  dependencies.handleNewProductFlow = handleNewProductFlow;
  dependencies.handleInventoryFlow = handleInventoryFlow;
  dependencies.handleSearchClientsFlow = handleSearchClientsFlow;
  dependencies.handleEditClientFlow = handleEditClientFlow;
  dependencies.sendOrdersByDatePage = sendOrdersByDatePage;
  dependencies.editOrSendFromQuery = editOrSendFromQuery;
  dependencies.sendNewClientOptionsPage = sendNewClientOptionsPage;
  dependencies.sendClientsSearchMenu = sendClientsSearchMenu;
  dependencies.sendCategoryOptionsPage = sendCategoryOptionsPage;
  dependencies.sendRouteOptionsPage = sendRouteOptionsPage;
  dependencies.sendCityOptionsPage = sendCityOptionsPage;
  dependencies.showClientResultsFiltered = showClientResultsFiltered;
  dependencies.showClientResultsByText = showClientResultsByText;
  dependencies.sendClientsOrdersPage = sendClientsOrdersPage;
  dependencies.searchClientsForSelection = searchClientsForSelection;
  dependencies.showOrUpdateCartSummary = showOrUpdateCartSummary;
  dependencies.sendEditClientMenu = sendEditClientMenu;
}

// Función de inicialización principal
function initializeBot() {
  // Actualizar dependencias con las funciones definidas
  updateDependencies();
  
  // Inicializar handlers
  initializeCommandHandler(dependencies);
  initializeCallbackHandler(dependencies);
  initializeMessageHandler(dependencies);
  
  // Registrar comandos
  registerCommands();
  
  // Registrar handlers de eventos
  bot.on('callback_query', handleCallbackQuery);
  bot.on('message', handleMessage);
  
  logger.info('bot_initialization', 'Bot inicializado correctamente con módulos refactorizados');
  console.log('Bot de Telegram iniciado. Esperando comandos...');
}

// Inicializar el bot al final del archivo
initializeBot();
