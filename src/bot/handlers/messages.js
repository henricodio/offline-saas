/**
 * Manejador de mensajes de texto del bot de Telegram
 */

const { createErrorHandler, logger } = require('../utils/errorHandler');
const { validateDate } = require('../utils/validators');
const { buildQtyPickerKeyboard, buildCartKeyboard } = require('../ui/keyboards');

let bot, supabase, userState;
let sendMainMenu, clearState;
let handleNewClientFlow, handleNewOrderFlow, handleNewProductFlow;
let handleInventoryFlow, handleSearchClientsFlow, handleEditClientFlow;
let sendOrdersByDatePage;

function initializeMessageHandler(dependencies) {
  bot = dependencies.bot;
  supabase = dependencies.supabase;
  userState = dependencies.userState;
  
  // Funciones de menú
  sendMainMenu = dependencies.sendMainMenu;
  clearState = dependencies.clearState;
  
  // Handlers de flujo
  handleNewClientFlow = dependencies.handleNewClientFlow;
  handleNewOrderFlow = dependencies.handleNewOrderFlow;
  handleNewProductFlow = dependencies.handleNewProductFlow;
  handleInventoryFlow = dependencies.handleInventoryFlow;
  handleSearchClientsFlow = dependencies.handleSearchClientsFlow;
  handleEditClientFlow = dependencies.handleEditClientFlow;
  
  // Funciones específicas
  sendOrdersByDatePage = dependencies.sendOrdersByDatePage;
}

/**
 * Flujo de ventas por fecha (entrada de texto)
 */
async function handleSalesByDateFlow(msg, state) {
  const chatId = msg.chat.id;
  const text = (msg.text || '').trim();
  if (!text || text.startsWith('/')) return;

  if (state.step === 'ask_date') {
    if (!validateDate(text)) {
      return bot.sendMessage(chatId, 'Formato de fecha inválido. Usa YYYY-MM-DD (ej.: 2023-08-15)');
    }
    state.data.date = text;
    state.step = 'done';
    userState.set(chatId, state);
    return sendOrdersByDatePage(chatId, text, 0);
  }
}

/**
 * Flujo de nueva venta (entrada de texto específica)
 * Maneja ingreso de código externo (SKU) para agregar producto al carrito
 */
async function handleNewOrderTextFlow(msg, state) {
  const chatId = msg.chat.id;
  const text = (msg.text || '').trim();
  if (!text || text.startsWith('/')) return;

  if (state.step === 'ask_qty') {
    // Cantidad manual para un producto previamente seleccionado
    const qty = Number(text.replace(',', '.'));
    if (!Number.isFinite(qty) || qty <= 0 || !Number.isInteger(qty)) {
      return bot.sendMessage(chatId, 'Cantidad inválida. Ingresa un número entero positivo (ej.: 1, 3, 12).');
    }
    const pending = state?.data?.pending_product;
    if (!pending?.id) {
      // Si por alguna razón no hay producto pendiente, volvemos al carrito
      state.step = 'cart';
      userState.set(chatId, state);
      return bot.sendMessage(chatId, 'No hay producto pendiente. Vuelve a seleccionar un producto.');
    }
    // Agregar al carrito
    const cart = Array.isArray(state.data.cart) ? state.data.cart : [];
    const idx = cart.findIndex((it) => it.product_id === pending.id);
    if (idx >= 0) {
      cart[idx].qty += qty;
    } else {
      cart.push({ product_id: pending.id, name: pending.name, price: Number(pending.price || 0), qty });
    }
    state.data.cart = cart;
    // Limpiar pending y volver a modo carrito
    delete state.data.pending_product;
    state.step = 'cart';
    userState.set(chatId, state);
    // Mostrar carrito actualizado
    const lines = [];
    let total = 0;
    for (const it of cart) {
      const subtotal = Number(it.price || 0) * Number(it.qty || 0);
      total += subtotal;
      lines.push(`• ${it.name} x${it.qty} = $${subtotal.toFixed(2)}`);
    }
    const texto = cart.length ? `Carrito:\n${lines.join('\n')}\n\nTotal: $${total.toFixed(2)}` : 'Carrito vacío.';
    const inline_keyboard = buildCartKeyboard(cart);
    return bot.sendMessage(chatId, texto, { reply_markup: { inline_keyboard } });
  }

  if (state.step === 'ask_product_code') {
    try {
      const code = text;
      const { data: product, error } = await supabase
        .from('products')
        .select('id, name, price, external_id')
        .eq('external_id', code)
        .maybeSingle();
      if (error) throw error;
      if (!product) {
        return bot.sendMessage(chatId, `No se encontró producto con código: ${code}. Intenta nuevamente o escribe "Cancelar".`);
      }
      // Volver al paso de carrito; la cantidad se elegirá con teclado
      state.step = 'cart';
      userState.set(chatId, state);
      const texto = `Producto encontrado: ${product.name}\nPrecio: $${Number(product.price || 0).toFixed(2)}\nSelecciona cantidad:`;
      const inline_keyboard = buildQtyPickerKeyboard(product.id);
      return bot.sendMessage(chatId, texto, { reply_markup: { inline_keyboard } });
    } catch (e) {
      logger.error('new_order_text_flow', e);
      return bot.sendMessage(chatId, 'Error buscando el producto por código.');
    }
  }
}

/**
 * Handler principal para mensajes de texto
 */
async function handleMessage(msg) {
  const errorHandler = createErrorHandler(bot, 'message_handler');
  
  try {
    if (!msg.text) return;
    const chatId = msg.chat.id;
    const text = msg.text.trim();

    logger.debug('message_handler', `Procesando mensaje: ${text.substring(0, 50)}...`, { chatId });

    // Cancelación universal
    if (text === 'Cancelar' || /^\/cancel(?:@\w+)?$/.test(text)) {
      clearState(chatId);
      await bot.sendMessage(chatId, 'Operación cancelada.');
      return sendMainMenu(chatId);
    }

    // Ignorar comandos (onText los maneja)
    if (text.startsWith('/')) return;

    // Enrutar según flujo activo
    const state = userState.get(chatId);
    if (!state || !state.flow) {
      logger.debug('message_handler', 'No hay flujo activo, ignorando mensaje', { chatId });
      return;
    }

    logger.debug('message_handler', `Enrutando a flujo: ${state.flow}`, { chatId, step: state.step });

    // Enrutamiento a handlers específicos
    switch (state.flow) {
      case 'new_client':
        return handleNewClientFlow(msg, state);
      
      case 'new_order':
        // Interceptar pasos de entrada por texto específicos del flujo de venta
        if (state.step === 'ask_product_code' || state.step === 'ask_qty') {
          return handleNewOrderTextFlow(msg, state);
        }
        return handleNewOrderFlow(msg, state);
      
      case 'new_product':
        return handleNewProductFlow(msg, state);
      
      case 'inventory':
        return handleInventoryFlow(msg, state);
      
      case 'search_clients':
        return handleSearchClientsFlow(msg, state);
      
      case 'edit_client':
        return handleEditClientFlow(msg, state);
      
      case 'sales_by_date':
        return handleSalesByDateFlow(msg, state);
      
      default:
        logger.warn('message_handler', `Flujo no reconocido: ${state.flow}`, { chatId });
        clearState(chatId);
        await bot.sendMessage(chatId, 'Flujo no válido. Reiniciando...');
        return sendMainMenu(chatId);
    }
    
  } catch (error) {
    await errorHandler(error, msg.chat.id, 'Error procesando mensaje');
  }
}

module.exports = {
  initializeMessageHandler,
  handleMessage,
  handleSalesByDateFlow
};
