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
  
  try {
    const user = await ensureUserByTelegram(msg);
    await bot.sendMessage(
      msg.chat.id,
      `¡Bienvenido, ${user.nombre || 'vendedor'}! Tu registro está listo.`
    );
    await sendMainMenu(msg.chat.id);
  } catch (error) {
    await errorHandler(error, msg.chat.id, 'Error al iniciar/registrar usuario. Intenta más tarde.');
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
    await sendMainMenu(msg.chat.id);
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
        usuario_responsable_id: usuario.id,
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
  handleViewOrdersCommand
};
