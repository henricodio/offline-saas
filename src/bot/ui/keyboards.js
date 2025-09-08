/**
 * Generadores centralizados de inline keyboards para el bot de Telegram
 */

const PAGE_SIZE = 5;
const CLIENTS_PAGE_SIZE = 10;
const OPTIONS_PAGE_SIZE = 10;

function trunc(str, maxLen) {
  if (!str) return 'N/D';
  return str.length > maxLen ? str.slice(0, maxLen - 1) + '…' : str;
}

/**
 * Teclado del menú principal
 */
function getMainMenuKeyboard() {
  return [
    [
      { text: 'Gestión Cliente', callback_data: 'menu:clients' },
      { text: 'Nueva Venta', callback_data: 'menu:new_order' }
    ],
    [
      { text: 'Consultar ventas', callback_data: 'sales:view_orders' },
      { text: 'Inventario', callback_data: 'menu:inventory' }
    ]
  ];
}

/**
 * Teclado del menú de clientes
 */
function getClientsMenuKeyboard() {
  return [
    [
      { text: 'Ver clientes', callback_data: 'clients:view' },
      { text: 'Nuevo cliente', callback_data: 'clients:new' }
    ],
    [
      { text: 'Editar cliente', callback_data: 'clients:edit' },
      { text: 'Buscar cliente', callback_data: 'clients:search' }
    ],
    [
      { text: '🏠 Menú Principal', callback_data: 'back:main' }
    ]
  ];
}

/**
 * Teclado del menú de inventario
 */
function getInventoryMenuKeyboard() {
  return [
    [
      { text: 'Buscar producto', callback_data: 'inventory:search' },
      { text: 'Nuevo producto', callback_data: 'inventory:new' }
    ],
    [
      { text: '🏠 Menú Principal', callback_data: 'back:main' }
    ]
  ];
}

/**
 * Teclado del submenú de consultar ventas
 */
function getSalesConsultMenuKeyboard() {
  return [
    [
      { text: 'Por fecha 📅', callback_data: 'sales:by_date' },
      { text: 'Por cliente 👤', callback_data: 'sales:by_client' }
    ],
    [
      { text: '🏠 Menú Principal', callback_data: 'back:main' }
    ]
  ];
}

/**
 * Factory genérico para listas de clientes con paginación
 */
function buildClientsListKeyboard(clients, page, count, callbackPrefix = 'client:show:', pagePrefix = 'clients_page:') {
  const rows = [];
  const list = clients || [];
  
  // Botones de clientes (2 por fila)
  for (let i = 0; i < list.length; i += 2) {
    const c1 = list[i];
    const c2 = list[i + 1];
    const btn1Label = trunc(c1?.nombre || 'N/D', 22);
    const row = [
      { text: btn1Label, callback_data: `${callbackPrefix}${c1.id}` }
    ];
    if (c2) {
      const btn2Label = trunc(c2?.nombre || 'N/D', 22);
      row.push({ text: btn2Label, callback_data: `${callbackPrefix}${c2.id}` });
    }
    rows.push(row);
  }
  
  // Navegación
  const lastPage = Math.max(0, Math.ceil((count || 0) / CLIENTS_PAGE_SIZE) - 1);
  const hasPrev = page > 0;
  const hasNext = page < lastPage;
  if (hasPrev || hasNext) {
    const nav = [];
    if (hasPrev) nav.push({ text: '◀️ Anterior', callback_data: `${pagePrefix}${page - 1}` });
    if (hasNext) nav.push({ text: 'Siguiente ▶️', callback_data: `${pagePrefix}${page + 1}` });
    rows.push(nav);
  }
  
  return rows;
}

/**
 * Teclado: lista de productos para nueva venta
 */
function buildProductsListKeyboard(products, page, count, term = 'all') {
  const rows = [];
  const list = products || [];
  for (let i = 0; i < list.length; i += 2) {
    const p1 = list[i];
    const p2 = list[i + 1];
    const row = [
      { text: trunc(p1?.name || 'N/D', 22), callback_data: `new_order:select_product:${p1.id}` }
    ];
    if (p2) row.push({ text: trunc(p2?.name || 'N/D', 22), callback_data: `new_order:select_product:${p2.id}` });
    rows.push(row);
  }

  // Navegación
  const lastPage = Math.max(0, Math.ceil((count || 0) / PAGE_SIZE) - 1);
  const hasPrev = page > 0;
  const hasNext = page < lastPage;
  if (hasPrev || hasNext) {
    const nav = [];
    if (hasPrev) nav.push({ text: '◀️ Anterior', callback_data: `new_order:products_page:${encodeURIComponent(term)}:${page - 1}` });
    if (hasNext) nav.push({ text: 'Siguiente ▶️', callback_data: `new_order:products_page:${encodeURIComponent(term)}:${page + 1}` });
    rows.push(nav);
  }

  // Acciones adicionales (2 columnas)
  rows.push([
    { text: '🔢 Ingresar código', callback_data: 'new_order:enter_code' },
    { text: '🛒 Ver carrito', callback_data: 'new_order:view_cart' }
  ]);
  // Navegación adicional solicitada
  rows.push([
    { text: '⬅️ Volver', callback_data: 'cancel_flow' },
    { text: '🏠 Menú', callback_data: 'back:main' }
  ]);
  rows.push([
    { text: '❌ Cancelar', callback_data: 'cancel_flow' }
  ]);

  return rows;
}

/**
 * Teclado: resumen de carrito con acciones por ítem
 */
function buildCartKeyboard(cart) {
  const rows = [];
  const items = cart || [];
  // Acciones por ítem: disminuir y eliminar
  for (const it of items) {
    rows.push([
      { text: `➖ ${trunc(it.name, 16)} (x${it.qty})`, callback_data: `new_order:item_dec:${it.product_id}` },
      { text: '🗑 Eliminar', callback_data: `new_order:item_del:${it.product_id}` }
    ]);
  }
  // Acciones globales
  rows.push([
    { text: '➕ Añadir producto', callback_data: 'new_order:products_page:all:0' },
    { text: '🔢 Ingresar código', callback_data: 'new_order:enter_code' }
  ]);
  rows.push([
    { text: '✅ Confirmar', callback_data: 'new_order:confirm' },
    { text: '❌ Cancelar', callback_data: 'cancel_flow' }
  ]);
  return rows;
}

/**
 * Teclado: selector de cantidad para un producto
 */
function buildQtyPickerKeyboard(productId) {
  return [
    [
      { text: '1', callback_data: `new_order:set_qty:${productId}:1` },
      { text: '2', callback_data: `new_order:set_qty:${productId}:2` }
    ],
    [
      { text: '3', callback_data: `new_order:set_qty:${productId}:3` },
      { text: '5', callback_data: `new_order:set_qty:${productId}:5` }
    ],
    [
      { text: '10', callback_data: `new_order:set_qty:${productId}:10` },
      { text: 'Cancelar', callback_data: 'new_order:view_cart' }
    ],
    [
      { text: '🔢 Cantidad manual', callback_data: `new_order:ask_qty:${productId}` }
    ]
  ];
}

/**
 * Teclado para lista de clientes (vista general)
 */
function buildClientsViewListKeyboard(clients, page, count) {
  const rows = buildClientsListKeyboard(clients, page, count, 'client:show:', 'clients_view_page:');
  rows.push([
    { text: '⬅️ Volver', callback_data: 'back:clients' },
    { text: '🏠 Menú', callback_data: 'back:main' }
  ]);
  return rows;
}

/**
 * Teclado para lista de clientes (edición)
 */
function buildClientsEditListKeyboard(clients, page, count) {
  const rows = buildClientsListKeyboard(clients, page, count, 'client:edit:', 'clients_edit_page:');
  rows.push([
    { text: '⬅️ Volver', callback_data: 'nav:back' },
    { text: '🏠 Menú Principal', callback_data: 'back:main' }
  ]);
  return rows;
}

/**
 * Teclado para selección de cliente en nueva venta
 */
function buildClientsSelectionKeyboard(clients, page, count) {
  const rows = buildClientsListKeyboard(clients, page, count, 'select_client:', 'clients_selection_page:');
  
  // Opciones adicionales para nueva venta
  rows.push([
    { text: '🔎 Buscar cliente', callback_data: 'quick_search_client' },
    { text: '➕ Crear cliente', callback_data: 'clients:new' }
  ]);
  rows.push([
    { text: '❌ Cancelar', callback_data: 'cancel_flow' }
  ]);
  
  return rows;
}

/**
 * Teclado para búsqueda rápida de clientes con término
 */
function buildClientsQuickSearchKeyboard(clients, page, count, term) {
  const rows = buildClientsListKeyboard(clients, page, count, 'select_client:', `clients_quick_text_page:${encodeURIComponent(term)}:`);
  rows.push([
    { text: '🔎 Nueva búsqueda', callback_data: 'quick_search_client' },
    { text: '➕ Crear cliente', callback_data: 'clients:new' }
  ]);
  rows.push([
    { text: '❌ Cancelar', callback_data: 'cancel_flow' }
  ]);
  return rows;
}

/**
 * Teclado para lista de clientes con enlace a sus pedidos
 */
function buildClientsOrdersListKeyboard(clients, page, count) {
  const rows = buildClientsListKeyboard(clients, page, count, 'sales_client_view_orders:', 'sales_clients_page:');
  rows.push([
    { text: '⬅️ Submenú', callback_data: 'sales:view_orders' },
    { text: '🏠 Menú', callback_data: 'back:main' }
  ]);
  return rows;
}

/**
 * Teclado para opciones de cliente individual (ficha)
 */
function getClientDetailsKeyboard(clientId) {
  return [
    [
      { text: '🛒 Nueva venta', callback_data: `client:new_order:${clientId}` },
      { text: '🧾 Consultar ventas', callback_data: `client:view_orders:${clientId}:0` }
    ],
    [
      { text: '✏️ Editar', callback_data: `client:edit:${clientId}` },
      { text: '🗑️ Eliminar', callback_data: `client:delete:${clientId}` }
    ],
    [
      { text: '⬅️ Lista', callback_data: 'clients:view' },
      { text: 'Volver', callback_data: 'back:clients' }
    ]
  ];
}

/**
 * Teclado para menú de edición de cliente
 */
function getEditClientMenuKeyboard() {
  return [
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
      { text: '❌ Cancelar', callback_data: 'cancel_flow' }
    ]
  ];
}

/**
 * Factory para listas de opciones paginadas (categorías, ciudades)
 */
function buildOptionsListKeyboard(options, page, fieldType, callbackPrefix) {
  const rows = [];
  const list = options || [];
  
  // Opciones (2 por fila)
  for (let i = 0; i < list.length; i += 2) {
    const opt1 = list[i];
    const opt2 = list[i + 1];
    const row = [
      { text: trunc(opt1, 20), callback_data: `${callbackPrefix}:${fieldType}:${encodeURIComponent(opt1)}` }
    ];
    if (opt2) {
      row.push({ text: trunc(opt2, 20), callback_data: `${callbackPrefix}:${fieldType}:${encodeURIComponent(opt2)}` });
    }
    rows.push(row);
  }
  
  // Navegación (simplificada para opciones)
  const totalPages = Math.ceil(list.length / OPTIONS_PAGE_SIZE);
  if (totalPages > 1) {
    const nav = [];
    if (page > 0) nav.push({ text: '◀️ Anterior', callback_data: `${callbackPrefix}_page:${fieldType}:${page - 1}` });
    if (page < totalPages - 1) nav.push({ text: 'Siguiente ▶️', callback_data: `${callbackPrefix}_page:${fieldType}:${page + 1}` });
    if (nav.length) rows.push(nav);
  }
  
  // Opciones adicionales
  rows.push([
    { text: '⏭️ Omitir', callback_data: `${callbackPrefix}_skip:${fieldType}` },
    { text: '✏️ Escribir', callback_data: `${callbackPrefix}_text:${fieldType}` }
  ]);
  
  return rows;
}

/**
 * Teclado de confirmación simple
 */
function getConfirmationKeyboard(confirmCallback, cancelCallback = 'cancel_flow') {
  return [
    [
      { text: '✅ Confirmar', callback_data: confirmCallback },
      { text: '❌ Cancelar', callback_data: cancelCallback }
    ]
  ];
}

/**
 * Teclado para navegación de pedidos
 */
function buildOrdersListKeyboard(orders, page, count, callbackPrefix = 'order:view:', pagePrefix = 'orders:list_page:') {
  const rows = [];
  const list = orders || [];
  
  // Pedidos (2 por fila)
  for (let i = 0; i < list.length; i += 2) {
    const o1 = list[i];
    const o2 = list[i + 1];
    const code1 = o1?.shortCode ? o1.shortCode : o1.id;
    const suffix1 = (o1 && o1.total != null) ? ` $${Number(o1.total).toFixed(2)}` : '';
    const row = [
      { text: `📄 #${code1}${suffix1}`, callback_data: `${callbackPrefix}${o1.id}` }
    ];
    if (o2) {
      const code2 = o2?.shortCode ? o2.shortCode : o2.id;
      const suffix2 = (o2 && o2.total != null) ? ` $${Number(o2.total).toFixed(2)}` : '';
      row.push({ text: `📄 #${code2}${suffix2}`, callback_data: `${callbackPrefix}${o2.id}` });
    }
    rows.push(row);
  }
  
  // Navegación
  const total = count || 0;
  const hasPrev = page > 0;
  const hasNext = (page + 1) * PAGE_SIZE < total;
  if (hasPrev || hasNext) {
    const nav = [];
    if (hasPrev) nav.push({ text: '◀️ Anterior', callback_data: `${pagePrefix}${page - 1}` });
    if (hasNext) nav.push({ text: 'Siguiente ▶️', callback_data: `${pagePrefix}${page + 1}` });
    rows.push(nav);
  }
  
  return rows;
}

/**
 * Teclado para pedidos por fecha con navegación específica
 */
function buildOrdersByDateKeyboard(orders, page, count, dateStr) {
  const rows = [];
  const list = orders || [];
  
  // Pedidos (2 por fila)
  for (let i = 0; i < list.length; i += 2) {
    const o1 = list[i];
    const o2 = list[i + 1];
    const code1 = o1?.shortCode ? o1.shortCode : o1.id;
    const suffix1 = (o1 && o1.total != null) ? ` $${Number(o1.total).toFixed(2)}` : '';
    const row = [
      { text: `📄 #${code1}${suffix1}`, callback_data: `order:view:${o1.id}` }
    ];
    if (o2) {
      const code2 = o2?.shortCode ? o2.shortCode : o2.id;
      const suffix2 = (o2 && o2.total != null) ? ` $${Number(o2.total).toFixed(2)}` : '';
      row.push({ text: `📄 #${code2}${suffix2}`, callback_data: `order:view:${o2.id}` });
    }
    rows.push(row);
  }
  
  // Navegación específica para fecha
  const total = count || 0;
  const hasPrev = page > 0;
  const hasNext = (page + 1) * PAGE_SIZE < total;
  if (hasPrev || hasNext) {
    const nav = [];
    if (hasPrev) nav.push({ text: '◀️ Anterior', callback_data: `orders_by_date_page:${dateStr}:${page - 1}` });
    if (hasNext) nav.push({ text: 'Siguiente ▶️', callback_data: `orders_by_date_page:${dateStr}:${page + 1}` });
    rows.push(nav);
  }
  
  rows.push([
    { text: '⬅️ Submenú', callback_data: 'sales:view_orders' },
    { text: '🏠 Menú', callback_data: 'back:main' }
  ]);
  
  return rows;
}

module.exports = {
  // Constantes
  PAGE_SIZE,
  CLIENTS_PAGE_SIZE,
  OPTIONS_PAGE_SIZE,
  
  // Utilidades
  trunc,
  
  // Menús principales
  getMainMenuKeyboard,
  getClientsMenuKeyboard,
  getInventoryMenuKeyboard,
  getSalesConsultMenuKeyboard,
  
  // Listas de clientes
  buildClientsViewListKeyboard,
  buildClientsEditListKeyboard,
  buildClientsSelectionKeyboard,
  buildClientsQuickSearchKeyboard,
  buildClientsOrdersListKeyboard,
  
  // Cliente individual
  getClientDetailsKeyboard,
  getEditClientMenuKeyboard,
  
  // Opciones y confirmaciones
  buildOptionsListKeyboard,
  getConfirmationKeyboard,
  
  // Pedidos
  buildOrdersListKeyboard,
  buildOrdersByDateKeyboard
  ,buildProductsListKeyboard
  ,buildCartKeyboard
  ,buildQtyPickerKeyboard
};
