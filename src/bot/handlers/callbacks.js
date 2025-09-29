/**
 * Manejador de callback queries del bot de Telegram
 */

const { createCallbackErrorHandler, logger } = require('../utils/errorHandler');
const { handleKpisCommand } = require('./commands');
const { 
  getMainMenuKeyboard, 
  getClientsMenuKeyboard, 
  getInventoryMenuKeyboard,
  getKpisMenuKeyboard,
  buildClientsViewListKeyboard,
  buildClientsEditListKeyboard,
  buildClientsSelectionKeyboard,
  buildClientsQuickSearchKeyboard,
  getClientDetailsKeyboard,
  getEditClientMenuKeyboard,
  getConfirmationKeyboard,
  buildOrdersByDateKeyboard,
  buildOrdersListKeyboard,
  buildProductsListKeyboard,
  buildCartKeyboard,
  buildQtyPickerKeyboard
} = require('../ui/keyboards');

let bot, supabase, userState;
let sendMainMenu, sendClientsMenu, sendInventoryMenu, sendSalesMenu, sendSalesConsultMenu;
let startNewClientFlow, startNewOrderFlow, startNewProductFlow, startInventoryFlow;
let clearState, ensureState, editOrSendFromQuery;
let sendNewClientOptionsPage, sendClientsSearchMenu, sendCategoryOptionsPage, sendRouteOptionsPage, sendCityOptionsPage;
let showClientResultsFiltered, showClientResultsByText, sendOrdersByDatePage, sendClientsOrdersPage, sendRecentOrdersPage;
let searchClientsForSelection, showOrUpdateCartSummary, sendEditClientMenu;
let fmtDate, trunc;

// Constantes importadas
const PAGE_SIZE = 5;
const CLIENTS_PAGE_SIZE = 10;

function initializeCallbackHandler(dependencies) {
  bot = dependencies.bot;
  supabase = dependencies.supabase;
  userState = dependencies.userState;
  
  // Funciones de menú
  sendMainMenu = dependencies.sendMainMenu;
  sendClientsMenu = dependencies.sendClientsMenu;
  sendInventoryMenu = dependencies.sendInventoryMenu;
  sendSalesMenu = dependencies.sendSalesMenu;
  sendSalesConsultMenu = dependencies.sendSalesConsultMenu;
  
  // Funciones de flujo
  startNewClientFlow = dependencies.startNewClientFlow;
  startNewOrderFlow = dependencies.startNewOrderFlow;
  startNewProductFlow = dependencies.startNewProductFlow;
  startInventoryFlow = dependencies.startInventoryFlow;
  
  // Utilidades
  clearState = dependencies.clearState;
  ensureState = dependencies.ensureState;
  editOrSendFromQuery = dependencies.editOrSendFromQuery;
  fmtDate = dependencies.fmtDate;
  trunc = dependencies.trunc;
  
  // Funciones específicas
  sendNewClientOptionsPage = dependencies.sendNewClientOptionsPage;
  sendClientsSearchMenu = dependencies.sendClientsSearchMenu;
  sendCategoryOptionsPage = dependencies.sendCategoryOptionsPage;
  sendRouteOptionsPage = dependencies.sendRouteOptionsPage;
  sendCityOptionsPage = dependencies.sendCityOptionsPage;
  showClientResultsFiltered = dependencies.showClientResultsFiltered;
  showClientResultsByText = dependencies.showClientResultsByText;
  sendOrdersByDatePage = dependencies.sendOrdersByDatePage;
  sendClientsOrdersPage = dependencies.sendClientsOrdersPage;
  sendRecentOrdersPage = dependencies.sendRecentOrdersPage;
  searchClientsForSelection = dependencies.searchClientsForSelection;
  showOrUpdateCartSummary = dependencies.showOrUpdateCartSummary;
  sendEditClientMenu = dependencies.sendEditClientMenu;
}

async function handleCallbackQuery(query) {
  const errorHandler = createCallbackErrorHandler(bot);
  
  try {
    const chatId = query.message?.chat.id;
    if (!chatId) return;
    
    const state = userState.get(chatId);
    const data = query.data || '';
    
    logger.debug('callback_query', `Procesando: ${data}`, { chatId });

    // === NAVEGACIÓN DE MENÚS ===
    if (data === 'menu:clients') {
      clearState(chatId);
      await bot.answerCallbackQuery(query.id);
      return sendClientsMenu(chatId);
    }
    
    if (data === 'menu:inventory') {
      clearState(chatId);
      await bot.answerCallbackQuery(query.id);
      return sendInventoryMenu(chatId);
    }
    
    if (data === 'menu:sales') {
      clearState(chatId);
      await bot.answerCallbackQuery(query.id);
      return sendSalesMenu(chatId);
    }
    
    if (data === 'menu:new_order') {
      clearState(chatId);
      await bot.answerCallbackQuery(query.id);
      const fakeMsg = { chat: { id: chatId }, from: query.from };
      return startNewOrderFlow(fakeMsg);
    }

    // Abrir web (fallback vía mensaje si no se puede usar URL directa en el botón)
    if (data === 'open:web') {
      await bot.answerCallbackQuery(query.id);
      const url = process.env.WEB_BASE_URL || 'http://localhost:3000';
      return bot.sendMessage(chatId, `Abre la web aquí: ${url}`);
    }
    
    if (data === 'menu:kpis') {
      clearState(chatId);
      await bot.answerCallbackQuery(query.id);
      const inline_keyboard = getKpisMenuKeyboard();
      return bot.sendMessage(chatId, 'KPIs — selecciona un rango:', { reply_markup: { inline_keyboard } });
    }

    if (data === 'kpis:weekly') {
      await bot.answerCallbackQuery(query.id);
      const fakeMsg = { chat: { id: chatId }, from: query.from, text: '/kpis' };
      return handleKpisCommand(fakeMsg);
    }

    if (data === 'kpis:monthly') {
      await bot.answerCallbackQuery(query.id);
      const fakeMsg = { chat: { id: chatId }, from: query.from, text: '/kpis mensual' };
      return handleKpisCommand(fakeMsg);
    }
    
    if (data === 'back:main') {
      clearState(chatId);
      await bot.answerCallbackQuery(query.id);
      return sendMainMenu(chatId);
    }
    
    if (data === 'back:clients') {
      clearState(chatId);
      await bot.answerCallbackQuery(query.id);
      return sendClientsMenu(chatId);
    }
    
    // Botón de navegación genérico (volver)
    if (data === 'nav:back') {
      await bot.answerCallbackQuery(query.id);
      // Por ahora, regresamos al menú de clientes (pila mínima)
      return sendClientsMenu(chatId);
    }

    // === GESTIÓN DE CLIENTES ===
    if (data === 'clients:new' || data === 'clients:add') {
      clearState(chatId);
      await bot.answerCallbackQuery(query.id);
      return startNewClientFlow(chatId);
    }
    
    if (data === 'clients:search') {
      clearState(chatId);
      await bot.answerCallbackQuery(query.id);
      return sendClientsSearchMenu(chatId);
    }
    
    // Sub-filtros de búsqueda de clientes
    if (data === 'clients:search:category') {
      await bot.answerCallbackQuery(query.id);
      return sendCategoryOptionsPage(chatId, 0);
    }
    if (data === 'clients:search:route') {
      await bot.answerCallbackQuery(query.id);
      return sendRouteOptionsPage(chatId, 0);
    }
    if (data === 'clients:search:city') {
      await bot.answerCallbackQuery(query.id);
      return sendCityOptionsPage(chatId, 0);
    }
    if (data === 'clients:search:text') {
      await bot.answerCallbackQuery(query.id);
      const st = ensureState(chatId);
      st.flow = 'search_clients';
      st.step = 'ask_text';
      userState.set(chatId, st);
      return bot.sendMessage(chatId, 'Escribe un término para buscar clientes por texto (nombre, contacto o dirección).');
    }
    
    if (data === 'clients:view') {
      await bot.answerCallbackQuery(query.id);
      return handleClientsView(query, chatId);
    }
    
    if (data === 'clients:edit') {
      await bot.answerCallbackQuery(query.id);
      return handleClientsEdit(query, chatId);
    }

    // === VENTAS ===
    if (data === 'sales:view_orders') {
      clearState(chatId);
      await bot.answerCallbackQuery(query.id);
      return sendSalesConsultMenu(chatId);
    }
    
    if (data === 'sales:by_date') {
      clearState(chatId);
      await bot.answerCallbackQuery(query.id);
      userState.set(chatId, { flow: 'sales_by_date', step: 'ask_date', data: {} });
      return bot.sendMessage(chatId, 'Ingresa la FECHA en formato YYYY-MM-DD para filtrar ventas:');
    }
    
    if (data === 'sales:by_client') {
      clearState(chatId);
      await bot.answerCallbackQuery(query.id);
      return sendClientsOrdersPage(chatId, 0);
    }
    
    // Paginación de ventas por fecha
    if (data.startsWith('orders_by_date_page:')) {
      await bot.answerCallbackQuery(query.id);
      const parts = data.split(':');
      const dateStr = parts[1];
      const page = parseInt(parts[2], 10) || 0;
      return sendOrdersByDatePage(chatId, dateStr, page);
    }
    
    // Paginación de clientes en submenú de ventas (por cliente)
    if (data.startsWith('sales_clients_page:')) {
      await bot.answerCallbackQuery(query.id);
      const page = parseInt(data.split(':')[1], 10) || 0;
      return sendClientsOrdersPage(chatId, page);
    }

    // Ver pedidos de un cliente desde su ficha (o inicio con página explícita)
    if (data.startsWith('client:view_orders:')) {
      await bot.answerCallbackQuery(query.id);
      // Formato: client:view_orders:<clientId>:<page>
      const parts = data.split(':');
      const clientId = parts[2];
      const page = parseInt(parts[3], 10) || 0;
      if (!clientId) return;
      return showClientOrdersPage(chatId, clientId, page);
    }

    // Ver pedidos de un cliente desde el submenú de ventas (lista de clientes)
    if (data.startsWith('sales_client_view_orders:')) {
      await bot.answerCallbackQuery(query.id);
      const clientId = data.split(':')[1];
      if (!clientId) return;
      return showClientOrdersPage(chatId, clientId, 0);
    }

    // Paginación de pedidos por cliente
    if (data.startsWith('client_view_orders_page:')) {
      await bot.answerCallbackQuery(query.id);
      // Formato: client_view_orders_page:<clientId>:<page>
      const parts = data.split(':');
      const clientId = parts[1];
      const page = parseInt(parts[2], 10) || 0;
      if (!clientId) return;
      return showClientOrdersPage(chatId, clientId, page, query);
    }

    // Ver detalle de un pedido específico
    if (data.startsWith('order:view:')) {
      await bot.answerCallbackQuery(query.id);
      const orderId = data.split(':')[2];
      if (!orderId) return;
      try {
        const { data: order, error } = await supabase
          .from('orders')
          .select('id, cliente_id, fecha, estado, total, created_at')
          .eq('id', orderId)
          .single();
        if (error || !order) throw error || new Error('Pedido no encontrado');

        let clienteNombre = null;
        if (order.cliente_id) {
          const { data: cli } = await supabase
            .from('clients')
            .select('nombre')
            .eq('id', order.cliente_id)
            .maybeSingle();
          clienteNombre = cli?.nombre || null;
        }

        // Calcular código corto del pedido
        let shortCode = String(order.id);
        try {
          const orderDate = order.fecha ? new Date(order.fecha) : new Date(order.created_at);
          const dd = orderDate.getDate();
          const mm = orderDate.getMonth() + 1;
          const yyyy = orderDate.getFullYear();
          const { count: seqCount } = await supabase
            .from('orders')
            .select('id', { count: 'exact', head: true })
            .eq('fecha', order.fecha || order.created_at?.slice(0,10))
            .lte('created_at', order.created_at);
          const seq = (seqCount || 1);
          shortCode = `${dd}/${mm}.${yyyy}-${seq}`;
        } catch (_) { /* noop */ }

        // Cargar ítems del pedido
        let items = [];
        try {
          const { data: rows, error: itemsErr } = await supabase
            .from('order_items')
            .select('nombre_producto, cantidad, precio_unitario, total_linea')
            .eq('order_id', orderId);
          if (itemsErr) throw itemsErr;
          items = rows || [];
        } catch (_) { /* noop */ }

        const lineas = [];
        lineas.push(`📄 Pedido ${shortCode}`);
        if (clienteNombre) lineas.push(`• Cliente: ${clienteNombre}`);
        if (order.fecha) lineas.push(`• Fecha: ${order.fecha}`);
        if (order.estado) lineas.push(`• Estado: ${order.estado}`);
        if (items.length) {
          lineas.push('• Ítems:');
          for (const it of items) {
            const qty = Number(it.cantidad || 0);
            const pu = Number(it.precio_unitario || 0);
            const sub = Number(it.total_linea != null ? it.total_linea : pu * qty);
            lineas.push(`   - ${it.nombre_producto} x${qty} @ $${pu.toFixed(2)} = $${sub.toFixed(2)}`);
          }
        }
        lineas.push(`• Total: $${Number(order.total).toFixed(2)}`);
        if (order.created_at) lineas.push(`• Creado: ${fmtDate(order.created_at)}`);
        const texto = lineas.join('\n');

        const inline_keyboard = [];
        if (order.cliente_id) {
          inline_keyboard.push([
            { text: '👤 Cliente', callback_data: `client:show:${order.cliente_id}` },
            { text: '🧾 Pedidos del cliente', callback_data: `client:view_orders:${order.cliente_id}:0` }
          ]);
          // Fila con acciones de venta (repetir e iniciar nueva venta)
          inline_keyboard.push([
            { text: '🔁 Repetir', callback_data: `order:repeat:${order.id}` },
            { text: '🛒 Nueva venta', callback_data: `client:new_order:${order.cliente_id}` }
          ]);
        }
        inline_keyboard.push([
          { text: '⬅️ Submenú', callback_data: 'sales:view_orders' },
          { text: '🏠 Menú', callback_data: 'back:main' }
        ]);

        return editOrSendFromQuery(query, texto, inline_keyboard);
      } catch (e) {
        logger.error('order_view', e);
        return bot.sendMessage(chatId, 'Error al mostrar el pedido.');
      }
    }

    // Paginación del listado global de pedidos
    if (data.startsWith('orders:list_page:')) {
      await bot.answerCallbackQuery(query.id);
      const page = parseInt(data.split(':')[2], 10) || 0;
      return sendRecentOrdersPage(chatId, page);
    }

    // Repetir un pedido: precargar carrito desde order_items
    if (data.startsWith('order:repeat:')) {
      await bot.answerCallbackQuery(query.id);
      const orderId = data.split(':')[2];
      if (!orderId) return;
      try {
        // Cargar pedido para obtener cliente
        const { data: order, error: ordErr } = await supabase
          .from('orders')
          .select('id, cliente_id')
          .eq('id', orderId)
          .single();
        if (ordErr || !order) throw ordErr || new Error('Pedido no encontrado');

        // Cargar ítems del pedido
        const { data: items, error: itemsErr } = await supabase
          .from('order_items')
          .select('product_id, nombre_producto, precio_unitario, cantidad')
          .eq('order_id', orderId);
        if (itemsErr) throw itemsErr;

        // Cargar nombre del cliente (opcional)
        let clienteNombre = null;
        if (order.cliente_id) {
          const { data: cli } = await supabase
            .from('clients')
            .select('nombre')
            .eq('id', order.cliente_id)
            .maybeSingle();
          clienteNombre = cli?.nombre || null;
        }

        // Preparar estado de nueva venta con carrito precargado
        const st = ensureState(chatId);
        st.flow = 'new_order';
        st.step = 'cart';
        st.data = st.data || {};
        st.data.cliente_id = order.cliente_id || st.data.cliente_id || null;
        if (clienteNombre) st.data.cliente_nombre = clienteNombre;
        st.data.cart = (items || []).map((it) => ({
          product_id: it.product_id,
          name: it.nombre_producto,
          price: Number(it.precio_unitario || 0),
          qty: Number(it.cantidad || 0)
        }));
        userState.set(chatId, st);

        // Renderizar carrito
        const cart = st.data.cart || [];
        const lines = [];
        let total = 0;
        for (const it of cart) {
          const subtotal = Number(it.price || 0) * Number(it.qty || 0);
          total += subtotal;
          lines.push(`• ${it.name} x${it.qty} = $${subtotal.toFixed(2)}`);
        }
        const header = clienteNombre ? `Repetir venta para ${clienteNombre}` : 'Repetir venta';
        const texto = cart.length ? `${header}\nCarrito:\n${lines.join('\n')}\n\nTotal: $${total.toFixed(2)}` : `${header}\nCarrito vacío.`;
        const inline_keyboard = buildCartKeyboard(cart);
        return bot.sendMessage(chatId, texto, { reply_markup: { inline_keyboard } });
      } catch (e) {
        logger.error('order_repeat', e);
        return bot.sendMessage(chatId, 'No se pudo repetir el pedido.');
      }
    }

    // === INVENTARIO ===
    if (data === 'inventory:search') {
      clearState(chatId);
      await bot.answerCallbackQuery(query.id);
      return startInventoryFlow(chatId);
    }
    
    if (data === 'inventory:new' || data === 'inventory:add') {
      clearState(chatId);
      await bot.answerCallbackQuery(query.id);
      return startNewProductFlow(chatId);
    }

    // === PAGINACIÓN Y SELECCIÓN ===
    if (data.startsWith('clients_view_page:')) {
      return handleClientsViewPagination(query, data);
    }
    
    if (data.startsWith('clients_edit_page:')) {
      return handleClientsEditPagination(query, data);
    }
    
    if (data.startsWith('client:show:')) {
      return handleClientShow(query, data);
    }
    
    if (data.startsWith('client:edit:')) {
      return handleClientEdit(query, data);
    }
    
    // Iniciar una nueva venta desde la ficha del cliente
    if (data.startsWith('client:new_order:')) {
      await bot.answerCallbackQuery(query.id);
      const clienteId = data.split(':')[2];
      if (!clienteId) return;
      const st = ensureState(chatId);
      st.flow = 'new_order';
      st.step = 'cart';
      st.data = st.data || {};
      try {
        const { data: client, error } = await supabase
          .from('clients')
          .select('id, nombre')
          .eq('id', clienteId)
          .single();
        if (error || !client) throw error || new Error('Cliente no encontrado');
        st.data.cliente_id = client.id;
        st.data.cliente_nombre = client.nombre;
        st.data.cart = [];
        userState.set(chatId, st);
        const texto = `Nueva venta para ${client.nombre}\nCarrito vacío. Añade productos.`;
        const inline_keyboard = [
          [
            { text: '➕ Añadir producto', callback_data: 'new_order:products_page:all:0' },
            { text: '🔢 Ingresar código', callback_data: 'new_order:enter_code' }
          ],
          [
            { text: '🛒 Ver carrito', callback_data: 'new_order:view_cart' },
            { text: '❌ Cancelar', callback_data: 'cancel_flow' }
          ]
        ];
        return bot.sendMessage(chatId, texto, { reply_markup: { inline_keyboard } });
      } catch (e) {
        logger.error('client_new_order', e);
        return bot.sendMessage(chatId, 'No se pudo iniciar la venta para este cliente.');
      }
    }

    // === FLUJOS ESPECÍFICOS ===
    if (state) {
      if (state.flow === 'new_client') {
        return handleNewClientCallbacks(query, state, data);
      }
      
      if (state.flow === 'new_order') {
        return handleNewOrderCallbacks(query, state, data);
      }
      
      if (state.flow === 'edit_client') {
        return handleEditClientCallbacks(query, state, data);
      }
      
      if (state.flow === 'search_clients') {
        // Paginaciones y selección en búsqueda por filtros
        if (data.startsWith('clients_search_options_page:')) {
          await bot.answerCallbackQuery(query.id);
          const [, type, pageStr] = data.split(':');
          const page = parseInt(pageStr, 10) || 0;
          if (type === 'category') return sendCategoryOptionsPage(chatId, page);
          if (type === 'route') return sendRouteOptionsPage(chatId, page);
          if (type === 'city') return sendCityOptionsPage(chatId, page);
        }
        if (data.startsWith('clients_search_select:')) {
          await bot.answerCallbackQuery(query.id, { text: 'Seleccionado' });
          const [, type, encVal] = data.split(':');
          const value = decodeURIComponent(encVal || '');
          return showClientResultsFiltered(chatId, type, value, 0);
        }
        if (data.startsWith('clients_text_results_page:')) {
          await bot.answerCallbackQuery(query.id);
          const parts = data.split(':');
          const term = decodeURIComponent(parts[1] || '');
          const page = parseInt(parts[2], 10) || 0;
          return showClientResultsByText(chatId, term, page);
        }
      }
    }

    // === CONFIRMACIONES ===
    if (data === 'confirm_new_client') {
      return handleConfirmNewClient(query, state);
    }
    
    if (data === 'confirm_edit_client') {
      return handleConfirmEditClient(query, state);
    }
    
    if (data === 'cancel_flow') {
      clearState(chatId);
      await bot.answerCallbackQuery(query.id, { text: 'Cancelado' });
      await bot.sendMessage(chatId, 'Operación cancelada.', { reply_markup: { remove_keyboard: true } });
      return sendMainMenu(chatId);
    }

    // === CALLBACKS NO MANEJADOS ===
    logger.warn('callback_query', `Callback no manejado: ${data}`, { chatId });
    await bot.answerCallbackQuery(query.id, { text: 'Acción no disponible' });
    
  } catch (error) {
    await errorHandler(error, query, 'callback_query_handler');
  }
}

// Listado de pedidos por cliente con paginación
async function showClientOrdersPage(chatId, clientId, page = 0, sourceQuery = null) {
  try {
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    // Obtener nombre del cliente para encabezado
    const { data: client, error: clientErr } = await supabase
      .from('clients')
      .select('id, nombre')
      .eq('id', clientId)
      .single();
    if (clientErr) throw clientErr;

    // Listar pedidos del cliente (incluye fecha/created_at para código corto)
    const { data: orders, count, error } = await supabase
      .from('orders')
      .select('id, total, fecha, created_at', { count: 'exact' })
      .eq('cliente_id', clientId)
      .order('id', { ascending: false })
      .range(from, to);
    if (error) throw error;

    // Calcular shortCode por pedido (dd/m.aaaa-#corr del día)
    const enriched = [];
    for (const o of (orders || [])) {
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

    // Teclado con paginación específica del cliente
    const inline_keyboard = buildOrdersListKeyboard(enriched || [], page, count || 0, 'order:view:', `client_view_orders_page:${clientId}:`);
    // Footer de navegación
    inline_keyboard.push([
      { text: '⬅️ Submenú', callback_data: 'sales:view_orders' },
      { text: '🏠 Menú', callback_data: 'back:main' }
    ]);

    const total = count || 0;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const titulo = client?.nombre ? `Pedidos de ${client.nombre}` : 'Pedidos del cliente';
    const texto = total
      ? `${titulo} — Total: ${total}\nPágina ${page + 1} de ${totalPages}`
      : `${titulo} — Sin pedidos.`;

    if (sourceQuery) {
      return editOrSendFromQuery(sourceQuery, texto, inline_keyboard);
    }
    return bot.sendMessage(chatId, texto, { reply_markup: { inline_keyboard } });
  } catch (e) {
    logger.error('client_orders_list', e);
    return bot.sendMessage(chatId, 'Error al listar pedidos del cliente.');
  }
}

// === HANDLERS ESPECÍFICOS ===

async function handleClientsView(query, chatId) {
  try {
    const { data: usuario, error: usrErr } = await supabase
      .from('users')
      .select('id')
      .eq('telegram_id', String(query.from.id))
      .single();
    if (usrErr) throw usrErr;
    
    const page = 0;
    let isAll = false;
    let clients, count, error;
    
    ({ data: clients, count, error } = await supabase
      .from('clients')
      .select('id, nombre, contacto', { count: 'exact' })
      .eq('usuario_responsable_id', usuario.id)
      .order('nombre', { ascending: true })
      .range(page * CLIENTS_PAGE_SIZE, page * CLIENTS_PAGE_SIZE + CLIENTS_PAGE_SIZE - 1));
    
    if (error) throw error;
    
    if (!count || count === 0) {
      isAll = true;
      const resAll = await supabase
        .from('clients')
        .select('id, nombre, contacto', { count: 'exact' })
        .order('nombre', { ascending: true })
        .range(page * CLIENTS_PAGE_SIZE, page * CLIENTS_PAGE_SIZE + CLIENTS_PAGE_SIZE - 1);
      if (resAll.error) throw resAll.error;
      clients = resAll.data;
      count = resAll.count;
    }
    
    const inline_keyboard = buildClientsViewListKeyboard(clients, page, count || 0);
    const totalPages = Math.max(1, Math.ceil((count || 0) / CLIENTS_PAGE_SIZE));
    const titulo = isAll ? 'Todos los clientes' : 'Mis clientes';
    const texto = (clients && clients.length)
      ? `${titulo} — Total: ${count || 0}\nPágina ${page + 1} de ${totalPages}\nToca un cliente para ver su ficha`
      : (isAll ? 'No hay clientes en el sistema.' : 'No tienes clientes aún.');
    
    return bot.sendMessage(chatId, texto, { reply_markup: { inline_keyboard } });
  } catch (e) {
    logger.error('clients_view', e);
    return bot.sendMessage(chatId, 'Error al listar clientes.');
  }
}

async function handleClientsEdit(query, chatId) {
  try {
    const { data: usuario, error: usrErr } = await supabase
      .from('users')
      .select('id')
      .eq('telegram_id', String(query.from.id))
      .single();
    if (usrErr) throw usrErr;
    
    const page = 0;
    let isAll = false;
    let clients, count, error;
    
    ({ data: clients, count, error } = await supabase
      .from('clients')
      .select('id, nombre, contacto', { count: 'exact' })
      .eq('usuario_responsable_id', usuario.id)
      .order('nombre', { ascending: true })
      .range(page * CLIENTS_PAGE_SIZE, page * CLIENTS_PAGE_SIZE + CLIENTS_PAGE_SIZE - 1));
    
    if (error) throw error;
    
    if (!count || count === 0) {
      isAll = true;
      const resAll = await supabase
        .from('clients')
        .select('id, nombre, contacto', { count: 'exact' })
        .order('nombre', { ascending: true })
        .range(page * CLIENTS_PAGE_SIZE, page * CLIENTS_PAGE_SIZE + CLIENTS_PAGE_SIZE - 1);
      if (resAll.error) throw resAll.error;
      clients = resAll.data;
      count = resAll.count;
    }
    
    const inline_keyboard = buildClientsEditListKeyboard(clients, page, count || 0);
    const totalPages = Math.max(1, Math.ceil((count || 0) / CLIENTS_PAGE_SIZE));
    const titulo = isAll ? 'Todos los clientes' : 'Mis clientes';
    const texto = (clients && clients.length)
      ? `${titulo} — Total: ${count || 0}\nPágina ${page + 1} de ${totalPages}\nToca un cliente para editar`
      : 'No hay clientes en esta página.';
    
    // Guardar punto de retorno simple a menú de clientes
    const st = ensureState(chatId);
    st.nav.stack.push({ view: 'clients_menu' });
    userState.set(chatId, st);
    
    await editOrSendFromQuery(query, texto, inline_keyboard);
  } catch (e) {
    logger.error('clients_edit', e);
    return bot.sendMessage(chatId, 'Error al listar clientes para editar.');
  }
}

async function handleClientShow(query, data) {
  await bot.answerCallbackQuery(query.id);
  const clienteId = data.split(':')[2];
  const chatId = query.message.chat.id;
  
  try {
    const { data: client, error: cliErr } = await supabase
      .from('clients')
      .select('id, nombre, contacto, direccion, category, route, created_at')
      .eq('id', clienteId)
      .single();
    if (cliErr || !client) throw cliErr || new Error('Cliente no encontrado');

    const { count: pedidosCount, error: cntErr } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('cliente_id', clienteId);
    if (cntErr) throw cntErr;

    const texto = [
      `🧾 ${client.nombre}`,
      client.contacto ? `• Contacto: ${client.contacto}` : null,
      client.direccion ? `• Dirección: ${client.direccion}` : null,
      client.category ? `• Categoría: ${client.category}` : null,
      client.route ? `• Ciudad: ${client.route}` : null,
      `• Pedidos: ${pedidosCount ?? 0}`,
      client.created_at ? `• Alta: ${fmtDate(client.created_at)}` : null,
    ].filter(Boolean).join('\n');

    const inline_keyboard = getClientDetailsKeyboard(client.id);
    return bot.sendMessage(chatId, texto, { reply_markup: { inline_keyboard } });
  } catch (e) {
    logger.error('client_show', e);
    return bot.sendMessage(chatId, 'Error al mostrar la ficha del cliente.');
  }
}

async function handleClientEdit(query, data) {
  await bot.answerCallbackQuery(query.id);
  const clienteId = data.split(':')[2];
  const chatId = query.message.chat.id;
  
  try {
    const { data: client, error } = await supabase
      .from('clients')
      .select('id, nombre, contacto, direccion, category, route')
      .eq('id', clienteId)
      .single();
    if (error || !client) throw error || new Error('Cliente no encontrado');

    userState.set(chatId, {
      flow: 'edit_client',
      step: 'menu',
      data: {
        client_id: clienteId,
        original: client,
        patch: {}
      }
    });
    
    return sendEditClientMenu(chatId, userState.get(chatId));
  } catch (e) {
    logger.error('client_edit', e);
    return bot.sendMessage(chatId, 'Error al cargar datos del cliente.');
  }
}

// Placeholder para otros handlers específicos
async function handleNewClientCallbacks(query, state, data) {
  const chatId = query.message.chat.id;
  try {
    // Paginación de opciones (categoría/ciudad)
    if (data.startsWith('new_client_options_page:')) {
      await bot.answerCallbackQuery(query.id);
      const [, type, pageStr] = data.split(':');
      const page = parseInt(pageStr, 10) || 0;
      return sendNewClientOptionsPage(chatId, type, page);
    }

    // Selección de opción
    if (data.startsWith('new_client_select_option:')) {
      await bot.answerCallbackQuery(query.id, { text: 'Seleccionado' });
      const [, type, encVal] = data.split(':');
      const value = decodeURIComponent(encVal || '');
      const field = type === 'city' ? 'route' : 'category';
      const st = ensureState(chatId);
      st.flow = 'new_client';
      st.data = st.data || {};
      st.data[field] = value;
      userState.set(chatId, st);
      return bot.sendMessage(chatId, `${type === 'city' ? 'Ciudad' : 'Categoría'} establecida: ${value}`);
    }

    // Omitir opción
    if (data.startsWith('new_client_skip_option:')) {
      await bot.answerCallbackQuery(query.id, { text: 'Omitido' });
      const [, type] = data.split(':');
      const field = type === 'city' ? 'route' : 'category';
      const st = ensureState(chatId);
      st.flow = 'new_client';
      st.data = st.data || {};
      st.data[field] = null;
      userState.set(chatId, st);
      return bot.sendMessage(chatId, `${type === 'city' ? 'Ciudad' : 'Categoría'} omitida.`);
    }

    // Entrada manual de categoría (informativo mientras el flujo de texto se mantiene mínimo)
    if (data === 'new_client_category_enter_text') {
      await bot.answerCallbackQuery(query.id);
      return bot.sendMessage(chatId, 'Escribe la CATEGORÍA en el chat. (Si usas el flujo mínimo, continúa con los campos básicos).');
    }
  } catch (e) {
    logger.error('new_client_callbacks', e);
    await bot.answerCallbackQuery(query.id, { text: 'Error' });
  }
}

async function handleNewOrderCallbacks(query, state, data) {
  const chatId = query.message.chat.id;
  try {
    // Selección directa de cliente
    if (data.startsWith('select_client:')) {
      await bot.answerCallbackQuery(query.id);
      const clienteId = data.split(':')[1];
      if (!clienteId) return;
      const { data: client, error } = await supabase
        .from('clients')
        .select('id, nombre')
        .eq('id', clienteId)
        .single();
      if (error || !client) throw error || new Error('Cliente no encontrado');
      state.data = state.data || {};
      state.data.cliente_id = client.id;
      state.data.cliente_nombre = client.nombre;
      state.data.cart = state.data.cart || [];
      state.step = 'cart';
      userState.set(chatId, state);
      const texto = `Nueva venta para ${client.nombre}\nCarrito vacío. Añade productos.`;
      const inline_keyboard = [
        [
          { text: '➕ Añadir producto', callback_data: 'new_order:products_page:all:0' },
          { text: '🔢 Ingresar código', callback_data: 'new_order:enter_code' }
        ],
        [
          { text: '🛒 Ver carrito', callback_data: 'new_order:view_cart' },
          { text: '❌ Cancelar', callback_data: 'cancel_flow' }
        ]
      ];
      return bot.sendMessage(chatId, texto, { reply_markup: { inline_keyboard } });
    }

    // Paginación de listado de selección (si se usa un listador general)
    if (data.startsWith('clients_selection_page:')) {
      await bot.answerCallbackQuery(query.id);
      const page = parseInt(data.split(':')[1], 10) || 0;
      try {
        // Intentar cargar clientes del usuario; fallback a todos
        const { data: usuario, error: usrErr } = await supabase
          .from('users')
          .select('id')
          .eq('telegram_id', String(query.from.id))
          .single();
        let isAll = false;
        let clients, count, error;
        ({ data: clients, count, error } = await supabase
          .from('clients')
          .select('id, nombre, contacto', { count: 'exact' })
          .eq('usuario_responsable_id', usuario.id)
          .order('nombre', { ascending: true })
          .range(page * CLIENTS_PAGE_SIZE, page * CLIENTS_PAGE_SIZE + CLIENTS_PAGE_SIZE - 1));
        if (error) throw error;
        if (!count || count === 0) {
          isAll = true;
          const resAll = await supabase
            .from('clients')
            .select('id, nombre, contacto', { count: 'exact' })
            .order('nombre', { ascending: true })
            .range(page * CLIENTS_PAGE_SIZE, page * CLIENTS_PAGE_SIZE + CLIENTS_PAGE_SIZE - 1);
          if (resAll.error) throw resAll.error;
          clients = resAll.data; count = resAll.count;
        }
        const inline_keyboard = buildClientsSelectionKeyboard(clients, page, count || 0);
        const totalPages = Math.max(1, Math.ceil((count || 0) / CLIENTS_PAGE_SIZE));
        const titulo = isAll ? 'Todos los clientes' : 'Mis clientes';
        const texto = (clients && clients.length)
          ? `${titulo} — Total: ${count || 0}\nPágina ${page + 1} de ${totalPages}\nToca un cliente para seleccionar`
          : (isAll ? 'No hay clientes en el sistema.' : 'No tienes clientes aún.');
        return editOrSendFromQuery(query, texto, inline_keyboard);
      } catch (e) {
        logger.error('clients_selection_page', e);
        return bot.sendMessage(chatId, 'Error al listar clientes.');
      }
    }

    // Paginación de resultados de búsqueda rápida
    if (data.startsWith('clients_quick_text_page:')) {
      await bot.answerCallbackQuery(query.id);
      const parts = data.split(':');
      // Formato: clients_quick_text_page:<term>:<page>
      const term = decodeURIComponent(parts[1] || '');
      const page = parseInt(parts[2], 10) || 0;
      return searchClientsForSelection(chatId, term, page);
    }

    // Entrar en modo búsqueda rápida de cliente (solo prompt + step)
    if (data === 'quick_search_client') {
      await bot.answerCallbackQuery(query.id);
      state.step = 'ask_quick_text';
      userState.set(chatId, state);
      return bot.sendMessage(chatId, 'Escribe un término para buscar clientes (ej.: nombre, contacto, dirección).');
    }

    // === FLUJO DE CARRITO ===
    // Ingresar código externo (SKU)
    if (data === 'new_order:enter_code') {
      await bot.answerCallbackQuery(query.id);
      state.step = 'ask_product_code';
      userState.set(chatId, state);
      return bot.sendMessage(chatId, 'Ingresa el CÓDIGO externo (SKU) del producto:');
    }
    // Pedir cantidad manual para un producto específico
    if (data.startsWith('new_order:ask_qty:')) {
      await bot.answerCallbackQuery(query.id);
      const productId = data.split(':')[2];
      if (!productId) return;
      try {
        const { data: product, error } = await supabase
          .from('products')
          .select('id, name, price')
          .eq('id', productId)
          .single();
        if (error || !product) throw error || new Error('Producto no encontrado');
        state.step = 'ask_qty';
        state.data = state.data || {};
        state.data.pending_product = { id: product.id, name: product.name, price: Number(product.price || 0) };
        userState.set(chatId, state);
        return bot.sendMessage(chatId, `Ingresa la CANTIDAD para: ${product.name}`);
      } catch (e) {
        logger.error('new_order_ask_qty', e);
        return bot.sendMessage(chatId, 'No se pudo preparar la entrada de cantidad.');
      }
    }
    // Listar productos (por término y página)
    if (data.startsWith('new_order:products_page:')) {
      await bot.answerCallbackQuery(query.id);
      const parts = data.split(':');
      // Formato: new_order:products_page:<term>:<page>
      const term = decodeURIComponent(parts[2] || 'all');
      const page = parseInt(parts[3], 10) || 0;
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      try {
        let sel = supabase
          .from('products')
          .select('id, name, price', { count: 'exact' })
          .order('name', { ascending: true })
          .range(from, to);
        if (term && term !== 'all') {
          const like = `%${term}%`;
          sel = sel.or(`name.ilike.${like},description.ilike.${like},category.ilike.${like}`);
        }
        const { data: products, count, error } = await sel;
        if (error) throw error;
        const inline_keyboard = buildProductsListKeyboard(products || [], page, count || 0, term || 'all');
        const total = count || 0;
        const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
        const titulo = term && term !== 'all' ? `Productos: "${term}"` : 'Productos';
        const texto = total
          ? `${titulo} — Total: ${total}\nPágina ${page + 1} de ${totalPages}`
          : `${titulo} — Sin resultados.`;
        return editOrSendFromQuery(query, texto, inline_keyboard);
      } catch (e) {
        logger.error('new_order_products_page', e);
        return bot.sendMessage(chatId, 'Error al listar productos.');
      }
    }

    // Seleccionar un producto y pedir cantidad
    if (data.startsWith('new_order:select_product:')) {
      await bot.answerCallbackQuery(query.id);
      const productId = data.split(':')[2];
      if (!productId) return;
      try {
        const { data: product, error } = await supabase
          .from('products')
          .select('id, name, price')
          .eq('id', productId)
          .single();
        if (error || !product) throw error || new Error('Producto no encontrado');
        state.step = 'cart';
        userState.set(chatId, state);
        const texto = `Producto: ${product.name}\nPrecio: $${Number(product.price || 0).toFixed(2)}\nSelecciona cantidad:`;
        const inline_keyboard = buildQtyPickerKeyboard(product.id);
        return bot.sendMessage(chatId, texto, { reply_markup: { inline_keyboard } });
      } catch (e) {
        logger.error('new_order_select_product', e);
        return bot.sendMessage(chatId, 'No se pudo cargar el producto.');
      }
    }

    // Establecer cantidad para un producto y agregar al carrito
    if (data.startsWith('new_order:set_qty:')) {
      await bot.answerCallbackQuery(query.id);
      const parts = data.split(':');
      // Formato: new_order:set_qty:<productId>:<qty>
      const productId = parts[2];
      const qty = parseInt(parts[3], 10) || 1;
      if (!productId || qty <= 0) return;
      try {
        const { data: product, error } = await supabase
          .from('products')
          .select('id, name, price')
          .eq('id', productId)
          .single();
        if (error || !product) throw error || new Error('Producto no encontrado');
        state.data = state.data || {};
        const cart = Array.isArray(state.data.cart) ? state.data.cart : [];
        const idx = cart.findIndex((it) => it.product_id === product.id);
        if (idx >= 0) {
          cart[idx].qty += qty;
        } else {
          cart.push({ product_id: product.id, name: product.name, price: Number(product.price || 0), qty });
        }
        state.data.cart = cart;
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
      } catch (e) {
        logger.error('new_order_set_qty', e);
        return bot.sendMessage(chatId, 'No se pudo agregar el producto al carrito.');
      }
    }

    // Ver carrito
    if (data === 'new_order:view_cart') {
      await bot.answerCallbackQuery(query.id);
      const cart = Array.isArray(state?.data?.cart) ? state.data.cart : [];
      const lines = [];
      let total = 0;
      for (const it of cart) {
        const subtotal = Number(it.price || 0) * Number(it.qty || 0);
        total += subtotal;
        lines.push(`• ${it.name} x${it.qty} = $${subtotal.toFixed(2)}`);
      }
      const texto = cart.length ? `Carrito:\n${lines.join('\n')}\n\nTotal: $${total.toFixed(2)}` : 'Carrito vacío.';
      const inline_keyboard = buildCartKeyboard(cart);
      return editOrSendFromQuery(query, texto, inline_keyboard);
    }

    // Disminuir cantidad de un ítem
    if (data.startsWith('new_order:item_dec:')) {
      await bot.answerCallbackQuery(query.id);
      const productId = data.split(':')[2];
      state.data = state.data || {};
      const cart = Array.isArray(state.data.cart) ? state.data.cart : [];
      const idx = cart.findIndex((it) => it.product_id === productId);
      if (idx >= 0) {
        cart[idx].qty -= 1;
        if (cart[idx].qty <= 0) cart.splice(idx, 1);
      }
      state.data.cart = cart;
      userState.set(chatId, state);
      // Re-render
      const lines = [];
      let total = 0;
      for (const it of cart) {
        const subtotal = Number(it.price || 0) * Number(it.qty || 0);
        total += subtotal;
        lines.push(`• ${it.name} x${it.qty} = $${subtotal.toFixed(2)}`);
      }
      const texto = cart.length ? `Carrito:\n${lines.join('\n')}\n\nTotal: $${total.toFixed(2)}` : 'Carrito vacío.';
      const inline_keyboard = buildCartKeyboard(cart);
      return editOrSendFromQuery(query, texto, inline_keyboard);
    }

    // Eliminar ítem del carrito
    if (data.startsWith('new_order:item_del:')) {
      await bot.answerCallbackQuery(query.id);
      const productId = data.split(':')[2];
      state.data = state.data || {};
      let cart = Array.isArray(state.data.cart) ? state.data.cart : [];
      cart = cart.filter((it) => it.product_id !== productId);
      state.data.cart = cart;
      userState.set(chatId, state);
      const lines = [];
      let total = 0;
      for (const it of cart) {
        const subtotal = Number(it.price || 0) * Number(it.qty || 0);
        total += subtotal;
        lines.push(`• ${it.name} x${it.qty} = $${subtotal.toFixed(2)}`);
      }
      const texto = cart.length ? `Carrito:\n${lines.join('\n')}\n\nTotal: $${total.toFixed(2)}` : 'Carrito vacío.';
      const inline_keyboard = buildCartKeyboard(cart);
      return editOrSendFromQuery(query, texto, inline_keyboard);
    }

    // Confirmar pedido: crear orders + order_items
    if (data === 'new_order:confirm') {
      await bot.answerCallbackQuery(query.id);
      try {
        const cart = Array.isArray(state?.data?.cart) ? state.data.cart : [];
        if (!cart.length) return bot.sendMessage(chatId, 'El carrito está vacío. Añade productos antes de confirmar.');
        const clienteId = state?.data?.cliente_id;
        if (!clienteId) return bot.sendMessage(chatId, 'Falta el cliente para esta venta.');
        // Obtener/crear usuario por telegram
        const tgId = String(query.from.id);
        let usuarioId;
        {
          const { data: existing, error: selErr } = await supabase
            .from('users')
            .select('id')
            .eq('telegram_id', tgId)
            .maybeSingle();
          if (selErr) throw selErr;
          if (existing) {
            usuarioId = existing.id;
          } else {
            const { data: inserted, error: insErr } = await supabase
              .from('users')
              .insert({ telegram_id: tgId, rol: 'vendedor' })
              .select('id')
              .single();
            if (insErr) throw insErr;
            usuarioId = inserted.id;
          }
        }
        // Crear pedido
        let total = 0;
        for (const it of cart) total += Number(it.price || 0) * Number(it.qty || 0);
        const today = new Date().toISOString().slice(0, 10);
        const { data: order, error: orderErr } = await supabase
          .from('orders')
          .insert({ cliente_id: clienteId, total, estado: 'pendiente', fecha: today, usuario_creador_id: usuarioId })
          .select('id, total, fecha, created_at')
          .single();
        if (orderErr) throw orderErr;
        // Insertar líneas
        const rows = cart.map((it) => ({
          order_id: order.id,
          product_id: it.product_id,
          nombre_producto: it.name,
          precio_unitario: Number(it.price || 0),
          cantidad: Number(it.qty || 0)
        }));
        const { error: linesErr } = await supabase
          .from('order_items')
          .insert(rows);
        if (linesErr) {
          // Rollback: eliminar el pedido creado si fallan las líneas
          try { await supabase.from('orders').delete().eq('id', order.id); } catch (_) {}
          throw linesErr;
        }
        // Calcular código corto del pedido (dd/m.aaaa-#corr del día)
        let shortCode = String(order.id);
        try {
          const orderDate = order.fecha ? new Date(order.fecha) : new Date(order.created_at);
          const dd = orderDate.getDate();
          const mm = orderDate.getMonth() + 1;
          const yyyy = orderDate.getFullYear();
          const { count: seqCount } = await supabase
            .from('orders')
            .select('id', { count: 'exact', head: true })
            .eq('fecha', order.fecha || today)
            .lte('created_at', order.created_at);
          const seq = (seqCount || 1);
          shortCode = `${dd}/${mm}.${yyyy}-${seq}`;
        } catch (_) { /* noop si falla el cómputo */ }

        // Limpiar estado
        clearState(chatId);
        // Mensaje final
        const inline_keyboard = [
          [ { text: '📄 Ver pedido', callback_data: `order:view:${order.id}` }, { text: '👤 Cliente', callback_data: `client:show:${clienteId}` } ],
          [ { text: '🧾 Pedidos del cliente', callback_data: `client:view_orders:${clienteId}:0` }, { text: '🏠 Menú', callback_data: 'back:main' } ]
        ];
        return bot.sendMessage(chatId, `Pedido creado correctamente. #${shortCode}\nTotal: $${Number(order.total || total).toFixed(2)}`, { reply_markup: { inline_keyboard } });
      } catch (e) {
        logger.error('new_order_confirm', e);
        return bot.sendMessage(chatId, 'Error al confirmar la venta. Verifica que la tabla order_items exista y vuelve a intentar.');
      }
    }
  } catch (e) {
    logger.error('new_order_callbacks', e);
    await bot.answerCallbackQuery(query.id, { text: 'Error' });
  }
}

async function handleEditClientCallbacks(query, state, data) {
  const chatId = query.message.chat.id;
  try {
    // Edición por texto de un campo
    if (data.startsWith('edit_client_field_text:')) {
      await bot.answerCallbackQuery(query.id);
      const field = data.split(':')[1];
      if (!['nombre', 'contacto', 'direccion'].includes(field)) {
        return bot.sendMessage(chatId, 'Campo no soportado para edición por texto.');
      }
      state.step = 'ask_field_text';
      state.data = state.data || {};
      state.data.field = field;
      userState.set(chatId, state);
      return bot.sendMessage(chatId, `Escribe el nuevo valor para ${field.toUpperCase()} ("!" para mantener, "-" para borrar):`);
    }

    // Mostrar opciones paginadas para categoría/ciudad
    if (data.startsWith('edit_client_field_options:')) {
      await bot.answerCallbackQuery(query.id);
      const [, type, pageStr] = data.split(':');
      const page = parseInt(pageStr, 10) || 0;
      const column = type === 'category' ? 'category' : 'route';
      const { data: rows, error } = await supabase
        .from('clients')
        .select(column)
        .not(column, 'is', null)
        .neq(column, '')
        .order(column, { ascending: true });
      if (error) throw error;
      const set = new Set((rows || []).map((r) => String(r[column]).trim()).filter(Boolean));
      const options = Array.from(set).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
      const OPTIONS_PAGE_SIZE = 10;
      const trunc = (s, max) => {
        if (!s) return '';
        const str = String(s);
        return str.length > max ? str.slice(0, Math.max(0, max - 1)) + '…' : str;
      };
      const from = page * OPTIONS_PAGE_SIZE;
      const to = from + OPTIONS_PAGE_SIZE;
      const pageItems = options.slice(from, to);
      const rowsKb = [];
      for (let i = 0; i < pageItems.length; i += 2) {
        const o1 = pageItems[i];
        const o2 = pageItems[i + 1];
        const row = [
          { text: trunc(o1, 24), callback_data: `edit_client_select_option:${type}:${encodeURIComponent(o1)}` }
        ];
        if (o2) row.push({ text: trunc(o2, 24), callback_data: `edit_client_select_option:${type}:${encodeURIComponent(o2)}` });
        rowsKb.push(row);
      }
      const totalPages = Math.max(1, Math.ceil(options.length / OPTIONS_PAGE_SIZE));
      const hasPrev = page > 0;
      const hasNext = page + 1 < totalPages;
      if (hasPrev) rowsKb.push([{ text: '⏮️ Primera', callback_data: `edit_client_options_page:${type}:0` }, { text: '◀️ Anterior', callback_data: `edit_client_options_page:${type}:${page - 1}` }]);
      if (hasNext) rowsKb.push([{ text: 'Siguiente ▶️', callback_data: `edit_client_options_page:${type}:${page + 1}` }, { text: 'Última ⏭️', callback_data: `edit_client_options_page:${type}:${totalPages - 1}` }]);
      rowsKb.push([{ text: '⬅️ Menú edición', callback_data: 'edit_client_back_to_menu' }, { text: '🧹 Borrar', callback_data: `edit_client_clear_option:${type}` }]);
      const titulo = type === 'category' ? 'Selecciona categoría' : 'Selecciona ciudad';
      return editOrSendFromQuery(query, `${titulo} — Página ${page + 1} de ${totalPages}`, rowsKb);
    }

    if (data.startsWith('edit_client_options_page:')) {
      // Reutilizar la misma lógica que arriba
      const parts = data.split(':');
      const type = parts[1];
      const page = parseInt(parts[2], 10) || 0;
      // Simular click en field_options
      return handleEditClientCallbacks(query, state, `edit_client_field_options:${type}:${page}`);
    }

    if (data.startsWith('edit_client_select_option:')) {
      await bot.answerCallbackQuery(query.id, { text: 'Seleccionado' });
      const [, type, encVal] = data.split(':');
      const value = decodeURIComponent(encVal || '');
      const field = type === 'category' ? 'category' : 'route';
      state.data = state.data || {};
      const patch = state.data.patch || {};
      patch[field] = value;
      state.data.patch = patch;
      state.step = 'menu';
      userState.set(chatId, state);
      return sendEditClientMenu(chatId, state);
    }

    if (data === 'edit_client_back_to_menu') {
      await bot.answerCallbackQuery(query.id);
      state.step = 'menu';
      userState.set(chatId, state);
      return sendEditClientMenu(chatId, state);
    }

    if (data.startsWith('edit_client_clear_option:')) {
      await bot.answerCallbackQuery(query.id, { text: 'Borrado' });
      const [, type] = data.split(':');
      const field = type === 'category' ? 'category' : 'route';
      state.data = state.data || {};
      const patch = state.data.patch || {};
      patch[field] = null;
      state.data.patch = patch;
      state.step = 'menu';
      userState.set(chatId, state);
      return sendEditClientMenu(chatId, state);
    }
  } catch (e) {
    logger.error('edit_client_callbacks', e);
    await bot.answerCallbackQuery(query.id, { text: 'Error' });
  }
}

async function handleConfirmNewClient(query, state) {
  const chatId = query.message.chat.id;
  try {
    await bot.answerCallbackQuery(query.id);
    if (!state || state.flow !== 'new_client') {
      return bot.sendMessage(chatId, 'No hay alta de cliente en curso.');
    }
    const nombre = state.data?.nombre;
    if (!nombre) return bot.sendMessage(chatId, 'Falta el NOMBRE del cliente.');
    // Asegurar usuario por telegram
    const tgId = String(query.from.id);
    let usuarioId;
    {
      const { data: existing, error: selErr } = await supabase
        .from('users')
        .select('id')
        .eq('telegram_id', tgId)
        .maybeSingle();
      if (selErr) throw selErr;
      if (existing) {
        usuarioId = existing.id;
      } else {
        const { data: inserted, error: insErr } = await supabase
          .from('users')
          .insert({ telegram_id: tgId, rol: 'vendedor' })
          .select('id')
          .single();
        if (insErr) throw insErr;
        usuarioId = inserted.id;
      }
    }
    const payload = {
      nombre,
      contacto: state.data?.contacto ?? null,
      direccion: state.data?.direccion ?? null,
      category: state.data?.category ?? null,
      route: state.data?.route ?? null,
      usuario_responsable_id: usuarioId
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
  } catch (e) {
    logger.error('confirm_new_client', e);
    return bot.sendMessage(chatId, 'Error al confirmar alta de cliente.');
  }
}

async function handleConfirmEditClient(query, state) {
  const chatId = query.message.chat.id;
  try {
    await bot.answerCallbackQuery(query.id);
    if (!state || state.flow !== 'edit_client') {
      return bot.sendMessage(chatId, 'No hay edición de cliente en curso.');
    }
    const id = state.data?.client_id || state.data?.cliente_id || state.data?.clientId || state.data?.clienteId || state.data?.client_id;
    const targetId = id || state.data?.client_id;
    if (!targetId) return bot.sendMessage(chatId, 'No se encontró el ID del cliente.');
    const patch = state.data?.patch || {};
    const allowed = ['nombre', 'contacto', 'direccion', 'category', 'route'];
    const updates = {};
    for (const k of allowed) {
      if (Object.prototype.hasOwnProperty.call(patch, k)) updates[k] = patch[k];
    }
    if (Object.keys(updates).length === 0) {
      return bot.sendMessage(chatId, 'No hay cambios para guardar.');
    }
    const { error } = await supabase
      .from('clients')
      .update(updates)
      .eq('id', targetId);
    if (error) throw error;
    clearState(chatId);
    await bot.sendMessage(chatId, 'Cliente actualizado correctamente.');
    return sendClientsMenu(chatId);
  } catch (e) {
    logger.error('confirm_edit_client', e);
    return bot.sendMessage(chatId, 'Error al guardar los cambios del cliente.');
  }
}

async function handleClientsViewPagination(query, data) {
  await bot.answerCallbackQuery(query.id);
  const chatId = query.message.chat.id;
  try {
    const page = parseInt(data.split(':')[1], 10) || 0;
    const { data: usuario, error: usrErr } = await supabase
      .from('users')
      .select('id')
      .eq('telegram_id', String(query.from.id))
      .single();
    if (usrErr) throw usrErr;
    let isAll = false;
    let clients, count, error;
    ({ data: clients, count, error } = await supabase
      .from('clients')
      .select('id, nombre, contacto', { count: 'exact' })
      .eq('usuario_responsable_id', usuario.id)
      .order('nombre', { ascending: true })
      .range(page * CLIENTS_PAGE_SIZE, page * CLIENTS_PAGE_SIZE + CLIENTS_PAGE_SIZE - 1));
    if (error) throw error;
    if (!count || count === 0) {
      isAll = true;
      const resAll = await supabase
        .from('clients')
        .select('id, nombre, contacto', { count: 'exact' })
        .order('nombre', { ascending: true })
        .range(page * CLIENTS_PAGE_SIZE, page * CLIENTS_PAGE_SIZE + CLIENTS_PAGE_SIZE - 1);
      if (resAll.error) throw resAll.error;
      clients = resAll.data; count = resAll.count;
    }
    const inline_keyboard = buildClientsViewListKeyboard(clients, page, count || 0);
    const totalPages = Math.max(1, Math.ceil((count || 0) / CLIENTS_PAGE_SIZE));
    const titulo = isAll ? 'Todos los clientes' : 'Mis clientes';
    const texto = (clients && clients.length)
      ? `${titulo} — Total: ${count || 0}\nPágina ${page + 1} de ${totalPages}\nToca un cliente para ver su ficha`
      : (isAll ? 'No hay clientes en el sistema.' : 'No tienes clientes aún.');
    return editOrSendFromQuery(query, texto, inline_keyboard);
  } catch (e) {
    logger.error('clients_view_pagination', e);
    return bot.sendMessage(chatId, 'Error al paginar clientes.');
  }
}

async function handleClientsEditPagination(query, data) {
  await bot.answerCallbackQuery(query.id);
  const chatId = query.message.chat.id;
  try {
    const page = parseInt(data.split(':')[1], 10) || 0;
    const { data: usuario, error: usrErr } = await supabase
      .from('users')
      .select('id')
      .eq('telegram_id', String(query.from.id))
      .single();
    if (usrErr) throw usrErr;
    let isAll = false;
    let clients, count, error;
    ({ data: clients, count, error } = await supabase
      .from('clients')
      .select('id, nombre, contacto', { count: 'exact' })
      .eq('usuario_responsable_id', usuario.id)
      .order('nombre', { ascending: true })
      .range(page * CLIENTS_PAGE_SIZE, page * CLIENTS_PAGE_SIZE + CLIENTS_PAGE_SIZE - 1));
    if (error) throw error;
    if (!count || count === 0) {
      isAll = true;
      const resAll = await supabase
        .from('clients')
        .select('id, nombre, contacto', { count: 'exact' })
        .order('nombre', { ascending: true })
        .range(page * CLIENTS_PAGE_SIZE, page * CLIENTS_PAGE_SIZE + CLIENTS_PAGE_SIZE - 1);
      if (resAll.error) throw resAll.error;
      clients = resAll.data; count = resAll.count;
    }
    const inline_keyboard = buildClientsEditListKeyboard(clients, page, count || 0);
    const totalPages = Math.max(1, Math.ceil((count || 0) / CLIENTS_PAGE_SIZE));
    const titulo = isAll ? 'Todos los clientes' : 'Mis clientes';
    const texto = (clients && clients.length)
      ? `${titulo} — Total: ${count || 0}\nPágina ${page + 1} de ${totalPages}\nToca un cliente para editar`
      : 'No hay clientes en esta página.';
    return editOrSendFromQuery(query, texto, inline_keyboard);
  } catch (e) {
    logger.error('clients_edit_pagination', e);
    return bot.sendMessage(chatId, 'Error al paginar clientes para editar.');
  }
}

module.exports = {
  initializeCallbackHandler,
  handleCallbackQuery
};
