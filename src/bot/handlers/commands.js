/**
 * Manejador de comandos del bot de Telegram
 */

const { createErrorHandler, logger } = require('../utils/errorHandler');
const { parseArgs, validateClientFormat, validateOrderFormat } = require('../utils/validators');

let bot, supabase, userState;
let sendMainMenu, clearState;
let ensureUserByTelegram, startNewClientFlow;
let sendRecentOrdersPage;

function initializeCommandHandler(dependencies) {
  bot = dependencies.bot;
  supabase = dependencies.supabase;
  userState = dependencies.userState;
  
  // Funciones de menú
  sendMainMenu = dependencies.sendMainMenu;
  clearState = dependencies.clearState;
  
  // Funciones específicas
  ensureUserByTelegram = dependencies.ensureUserByTelegram;
  startNewClientFlow = dependencies.startNewClientFlow;
  sendRecentOrdersPage = dependencies.sendRecentOrdersPage;
}

/**
 * Comando /start - Registro e inicio
 */
async function handleStartCommand(msg) {
  const errorHandler = createErrorHandler(bot, 'start_command');
  
  // Paso 1: Registrar/asegurar usuario
  try {
    const user = await ensureUserByTelegram(msg);
    await bot.sendMessage(
      msg.chat.id,
      `¡Bienvenido, ${user.nombre || 'vendedor'}! Tu registro está listo.`
    );
  } catch (error) {
    return errorHandler(error, msg.chat.id, 'Error al iniciar/registrar usuario. Intenta más tarde.');
  }

  // Paso 2: Intentar mostrar menú (errores aquí no deben considerarse fallo de registro)
  try {
    await sendMainMenu(msg.chat.id);
  } catch (e) {
    logger.warn('start_command_menu', e);
    await bot.sendMessage(msg.chat.id, 'No se pudo abrir el menú automáticamente. Escribe /menu para continuar.');
  }
}

/**
 * Comando /menu - Mostrar menú principal
 */
async function handleMenuCommand(msg) {
  const errorHandler = createErrorHandler(bot, 'menu_command');
  
  try {
    await ensureUserByTelegram(msg);
    clearState(msg.chat.id);
    try {
      await sendMainMenu(msg.chat.id);
    } catch (e) {
      logger.warn('menu_command_send', e);
      const inline_keyboard = [[
        { text: 'Gestión Cliente', callback_data: 'menu:clients' },
        { text: 'Nueva Venta', callback_data: 'menu:new_order' }
      ], [
        { text: 'Consultar ventas', callback_data: 'sales:view_orders' }
      ]];
      await bot.sendMessage(msg.chat.id, 'Menú básico (modo seguro). Algunas opciones pueden no estar disponibles temporalmente.', { reply_markup: { inline_keyboard } });
    }
  } catch (error) {
    await errorHandler(error, msg.chat.id);
  }
}

/**
 * Comando /help - Ayuda
 */
async function handleHelpCommand(msg) {
  const help = [
    'Comandos disponibles:',
    '• /start - Registro',
    '• /menu - Mostrar menú con botones',
    '• /nuevo_cliente Nombre | Contacto | Dirección',
    '• /nuevo_pedido ClienteID | Total | Notas',
    '• /ver_pedidos - Últimos pedidos',
    '',
    'También puedes usar el flujo guiado con botones para crear clientes y pedidos.'
  ].join('\n');
  
  await bot.sendMessage(msg.chat.id, help);
}

/**
 * Comando /nuevo_cliente - Crear cliente rápido
 */
async function handleNewClientCommand(msg, match) {
  const errorHandler = createErrorHandler(bot, 'new_client_command');
  
  try {
    await ensureUserByTelegram(msg);
    const args = parseArgs(msg.text || '');
    
    if (args.length === 0) {
      // Sin argumentos, usar flujo guiado
      clearState(msg.chat.id);
      return startNewClientFlow(msg.chat.id);
    }
    
    // Validar formato
    const validation = validateClientFormat(msg.text);
    if (!validation.valid) {
      return bot.sendMessage(msg.chat.id, validation.error);
    }
    
    const [nombre, contacto = null, direccion = null] = args;
    
    // Obtener usuario responsable
    const { data: usuario, error: usrErr } = await supabase
      .from('users')
      .select('id')
      .eq('telegram_id', String(msg.from.id))
      .single();
    if (usrErr) throw usrErr;
    
    // Crear cliente
    const { data: inserted, error: insErr } = await supabase
      .from('clients')
      .insert({
        nombre: nombre.trim(),
        contacto: contacto?.trim() || null,
        direccion: direccion?.trim() || null,
        usuario_responsable_id: usuario.id
      })
      .select('id, nombre')
      .single();
    
    if (insErr) throw insErr;
    
    await bot.sendMessage(
      msg.chat.id,
      `Cliente creado: ${inserted.nombre} (ID: ${inserted.id})`
    );
    
  } catch (error) {
    await errorHandler(error, msg.chat.id, 'Error al crear cliente');
  }
}

/**
 * Comando /nuevo_pedido - Crear pedido rápido
 */
async function handleNewOrderCommand(msg) {
  const errorHandler = createErrorHandler(bot, 'new_order_command');
  
  try {
    await ensureUserByTelegram(msg);
    const args = parseArgs(msg.text || '');
    
    if (args.length === 0) {
      // Sin argumentos, mostrar ayuda
      return bot.sendMessage(
        msg.chat.id,
        'Formato: /nuevo_pedido ClienteID | Total | Notas\nEjemplo: /nuevo_pedido 123 | 45.50 | Pedido urgente'
      );
    }
    
    // Validar formato
    const validation = validateOrderFormat(msg.text);
    if (!validation.valid) {
      return bot.sendMessage(msg.chat.id, validation.error);
    }
    
    const [clienteIdStr, totalStr, notas = null] = args;
    const clienteId = parseInt(clienteIdStr, 10);
    const total = Number(totalStr.replace(',', '.'));
    
    // Verificar que el cliente existe
    const { data: client, error: cliErr } = await supabase
      .from('clients')
      .select('id, nombre')
      .eq('id', clienteId)
      .single();
    if (cliErr || !client) {
      return bot.sendMessage(msg.chat.id, `Cliente con ID ${clienteId} no encontrado.`);
    }
    
    // Obtener usuario responsable
    const { data: usuario, error: usrErr } = await supabase
      .from('users')
      .select('id')
      .eq('telegram_id', String(msg.from.id))
      .single();
    if (usrErr) throw usrErr;
    
    // Crear pedido
    const { data: inserted, error: insErr } = await supabase
      .from('orders')
      .insert({
        cliente_id: clienteId,
        total,
        estado: 'pendiente',
        notas: notas?.trim() || null,
        usuario_creador_id: usuario.id,
        fecha: new Date().toISOString().slice(0, 10)
      })
      .select('id, total, estado')
      .single();
    
    if (insErr) throw insErr;
    
    await bot.sendMessage(
      msg.chat.id,
      `Pedido creado: #${inserted.id} para ${client.nombre}\nTotal: $${Number(inserted.total).toFixed(2)} | Estado: ${inserted.estado}`
    );
    
  } catch (error) {
    await errorHandler(error, msg.chat.id, 'Error al crear pedido');
  }
}

/**
 * Comando /ver_pedidos - Listar pedidos recientes
 */
async function handleViewOrdersCommand(msg) {
  const errorHandler = createErrorHandler(bot, 'view_orders_command');
  
  try {
    return sendRecentOrdersPage(msg.chat.id, 0);
  } catch (error) {
    await errorHandler(error, msg.chat.id, 'Error al listar pedidos');
  }
}

/**
 * Comando /kpis - KPIs de los últimos 7 días
 */
async function handleKpisCommand(msg, match) {
  const errorHandler = createErrorHandler(bot, 'kpis_command');
  try {
    // Asegurar usuario y obtener su id interno
    await ensureUserByTelegram(msg);
    const { data: usuario, error: usrErr } = await supabase
      .from('users')
      .select('id')
      .eq('telegram_id', String(msg.from.id))
      .single();
    if (usrErr || !usuario) throw usrErr || new Error('Usuario no encontrado');

    const rawArgs = (msg.text || '').split(' ').slice(1).map(s => s.trim().toLowerCase()).filter(Boolean);
    const isMonthly = rawArgs.some(a => ['mensual','mes','monthly','month'].includes(a));

    if (!isMonthly) {
      // Semanal (últimos 7 días)
      const end = new Date();
      const start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const startDate = start.toISOString().slice(0, 10);
      const endDate = end.toISOString().slice(0, 10);

      const { data: rows, error } = await supabase
        .from('orders')
        .select('total, cliente_id')
        .gte('fecha', startDate)
        .lte('fecha', endDate)
        .eq('usuario_creador_id', usuario.id)
        .limit(5000);
      if (error) throw error;

      const list = rows || [];
      const sales_count = list.length;
      const total_revenue = list.reduce((acc, r) => acc + Number(r.total || 0), 0);
      const aov = sales_count > 0 ? (total_revenue / sales_count) : 0;
      const active_clients = new Set(list.map(r => r.cliente_id).filter(Boolean)).size;

      const txt = [
        'KPIs (últimos 7 días):',
        `• Ingresos: $${total_revenue.toFixed(2)}`,
        `• Ventas: ${sales_count}`,
        `• AOV (ticket medio): $${aov.toFixed(2)}`,
        `• Clientes activos: ${active_clients}`,
        '',
        `Rango: ${startDate} a ${endDate}`,
        'Tip: usa "/kpis mensual" para ver el mes con YoY.'
      ].join('\n');

      return bot.sendMessage(msg.chat.id, txt);
    }

    // Mensual (mes actual) con YoY
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const lastYearMonthStart = new Date(now.getFullYear() - 1, now.getMonth(), 1);
    const lastYearNextMonthStart = new Date(now.getFullYear() - 1, now.getMonth() + 1, 1);

    const startDate = monthStart.toISOString().slice(0, 10);
    const endDate = nextMonthStart.toISOString().slice(0, 10);
    const startDateLY = lastYearMonthStart.toISOString().slice(0, 10);
    const endDateLY = lastYearNextMonthStart.toISOString().slice(0, 10);

    const [curRes, lyRes] = await Promise.all([
      supabase
        .from('orders')
        .select('total, cliente_id')
        .gte('fecha', startDate)
        .lt('fecha', endDate)
        .eq('usuario_creador_id', usuario.id)
        .limit(50000),
      supabase
        .from('orders')
        .select('total, cliente_id')
        .gte('fecha', startDateLY)
        .lt('fecha', endDateLY)
        .eq('usuario_creador_id', usuario.id)
        .limit(50000)
    ]);
    if (curRes.error) throw curRes.error;
    if (lyRes.error) throw lyRes.error;

    const list = (curRes.data || []);
    const listLY = (lyRes.data || []);

    const sales_count = list.length;
    const total_revenue = list.reduce((acc, r) => acc + Number(r.total || 0), 0);
    const aov = sales_count > 0 ? (total_revenue / sales_count) : 0;
    const active_clients = new Set(list.map(r => r.cliente_id).filter(Boolean)).size;

    const sales_count_ly = listLY.length;
    const total_revenue_ly = listLY.reduce((acc, r) => acc + Number(r.total || 0), 0);
    const aov_ly = sales_count_ly > 0 ? (total_revenue_ly / sales_count_ly) : 0;
    const active_clients_ly = new Set(listLY.map(r => r.cliente_id).filter(Boolean)).size;

    function pct(curr, prev) {
      if (!prev || prev === 0) return '—';
      const p = ((curr - prev) / prev) * 100;
      return `${p >= 0 ? '+' : ''}${p.toFixed(1)}%`;
    }

    const txt = [
      'KPIs (mes actual):',
      `• Ingresos: $${total_revenue.toFixed(2)} (${pct(total_revenue, total_revenue_ly)} YoY)`,
      `• Ventas: ${sales_count} (${pct(sales_count, sales_count_ly)} YoY)`,
      `• AOV: $${aov.toFixed(2)} (${pct(aov, aov_ly)} YoY)`,
      `• Clientes activos: ${active_clients} (${pct(active_clients, active_clients_ly)} YoY)`,
      '',
      `Rango: ${startDate} a ${endDate}`,
      `Comparación: ${startDateLY} a ${endDateLY}`
    ].join('\n');

    await bot.sendMessage(msg.chat.id, txt);
  } catch (error) {
    await errorHandler(error, msg.chat.id, 'Error al calcular KPIs');
  }
}

/**
 * Registrar todos los comandos
 */
function registerCommands() {
  // Comando de inicio
  bot.onText(/^\/start(?:@\w+)?$/, handleStartCommand);
  
  // Comandos de menú/ayuda
  bot.onText(/^\/menu(?:@\w+)?$/, handleMenuCommand);
  bot.onText(/^\/help(?:@\w+)?$/, handleHelpCommand);
  
  // Comandos de creación rápida
  bot.onText(/^\/nuevo_cliente(?:@\w+)?(.*)$/s, handleNewClientCommand);
  bot.onText(/^\/nuevo_pedido(?:@\w+)?(.*)$/s, handleNewOrderCommand);
  
  // Comandos de consulta
  bot.onText(/^\/ver_pedidos(?:@\w+)?$/, handleViewOrdersCommand);
  bot.onText(/^\/kpis(?:@\w+)?(?:\s+.*)?$/s, handleKpisCommand);
  
  logger.info('commands', 'Comandos registrados exitosamente');
}

module.exports = {
  initializeCommandHandler,
  registerCommands,
  handleStartCommand,
  handleMenuCommand,
  handleHelpCommand,
  handleNewClientCommand,
  handleNewOrderCommand,
  handleViewOrdersCommand,
  handleKpisCommand
};
