/**
 * Servicio de lógica de negocio para el bot de Telegram
 * Contiene la lógica específica del dominio separada de la UI
 */

const db = require('./database');
const { logger } = require('../utils/errorHandler');
const { validateRequiredText, validatePositiveNumber } = require('../utils/validators');

// === GESTIÓN DE CLIENTES ===

/**
 * Procesa la creación de un cliente con validaciones de negocio
 */
async function processClientCreation(clientData, userId) {
  // Validaciones de negocio
  if (!validateRequiredText(clientData.nombre)) {
    throw new Error('El nombre del cliente es obligatorio');
  }
  
  if (clientData.nombre.length > 100) {
    throw new Error('El nombre del cliente es demasiado largo (máximo 100 caracteres)');
  }
  
  // Normalizar datos
  const normalizedData = {
    nombre: clientData.nombre.trim(),
    contacto: clientData.contacto?.trim() || null,
    direccion: clientData.direccion?.trim() || null,
    category: clientData.category?.trim() || null,
    route: clientData.route?.trim() || null,
    id_fiscal: clientData.id_fiscal?.trim() || null,
    phone: clientData.phone?.trim() || null,
    discount_percentage: clientData.discount_percentage || null,
    observations: clientData.observations?.trim() || null,
    start_date: clientData.start_date || null,
    city: clientData.city?.trim() || null
  };
  
  return await db.createClient(normalizedData, userId);
}

/**
 * Procesa la actualización de un cliente con validaciones
 */
async function processClientUpdate(clientId, updates) {
  // Validar que el cliente existe
  const existingClient = await db.getClientById(clientId);
  if (!existingClient) {
    throw new Error('Cliente no encontrado');
  }
  
  // Validar nombre si se está actualizando
  if (updates.nombre !== undefined) {
    if (!validateRequiredText(updates.nombre)) {
      throw new Error('El nombre del cliente no puede estar vacío');
    }
    updates.nombre = updates.nombre.trim();
  }
  
  // Filtrar solo campos válidos para actualización
  const allowedFields = ['nombre', 'contacto', 'direccion', 'category', 'route', 'id_fiscal', 'phone', 'discount_percentage', 'observations', 'city'];
  const filteredUpdates = {};
  
  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      filteredUpdates[field] = updates[field];
    }
  }
  
  if (Object.keys(filteredUpdates).length === 0) {
    throw new Error('No hay cambios para aplicar');
  }
  
  return await db.updateClient(clientId, filteredUpdates);
}

// === GESTIÓN DE PRODUCTOS ===

/**
 * Procesa la creación de un producto con validaciones
 */
async function processProductCreation(productData) {
  // Validaciones de negocio
  if (!validateRequiredText(productData.name)) {
    throw new Error('El nombre del producto es obligatorio');
  }
  
  if (!validatePositiveNumber(productData.price)) {
    throw new Error('El precio debe ser un número positivo');
  }
  
  if (productData.stock !== undefined && (!Number.isInteger(productData.stock) || productData.stock < 0)) {
    throw new Error('El stock debe ser un número entero no negativo');
  }
  
  // Normalizar datos
  const normalizedData = {
    name: productData.name.trim(),
    price: Number(productData.price),
    category: productData.category?.trim() || null,
    external_id: productData.external_id?.trim() || null,
    stock: productData.stock || 0,
    description: productData.description?.trim() || null,
    source: productData.source || 'Manual'
  };
  
  return await db.createProduct(normalizedData);
}

// === GESTIÓN DE PEDIDOS ===

/**
 * Procesa la creación de un pedido completo con items
 */
async function processOrderCreation(orderData, cartItems, userId) {
  // Validaciones de negocio
  if (!orderData.cliente_id) {
    throw new Error('Debe seleccionar un cliente');
  }
  
  if (!cartItems || cartItems.length === 0) {
    throw new Error('El carrito no puede estar vacío');
  }
  
  // Validar que el cliente existe
  const client = await db.getClientById(orderData.cliente_id);
  if (!client) {
    throw new Error('Cliente no encontrado');
  }
  
  // Calcular total del carrito
  const calculatedTotal = cartItems.reduce((sum, item) => {
    return sum + (Number(item.qty || 0) * Number(item.price || 0));
  }, 0);
  
  // Crear el pedido
  const orderInsertData = {
    cliente_id: orderData.cliente_id,
    total: calculatedTotal,
    estado: 'pendiente',
    notas: orderData.notas?.trim() || null
  };
  
  const createdOrder = await db.createOrder(orderInsertData, userId);
  
  // Crear los items del pedido
  const orderItems = cartItems.map(item => ({
    product_id: item.product_id,
    cantidad: Number(item.qty),
    precio_unitario: Number(item.price)
  }));
  
  await db.createOrderItems(createdOrder.id, orderItems);
  
  logger.info('order_processed', `Pedido procesado completamente: #${createdOrder.id}`, {
    orderId: createdOrder.id,
    clienteId: orderData.cliente_id,
    total: calculatedTotal,
    itemCount: orderItems.length,
    userId
  });
  
  return {
    order: createdOrder,
    items: orderItems,
    client: client
  };
}

/**
 * Calcula el total de un carrito
 */
function calculateCartTotal(cartItems) {
  if (!cartItems || cartItems.length === 0) return 0;
  
  return cartItems.reduce((sum, item) => {
    const qty = Number(item.qty || 0);
    const price = Number(item.price || 0);
    return sum + (qty * price);
  }, 0);
}

/**
 * Valida los items de un carrito
 */
function validateCartItems(cartItems) {
  if (!Array.isArray(cartItems)) {
    return { valid: false, error: 'El carrito debe ser un array' };
  }
  
  if (cartItems.length === 0) {
    return { valid: false, error: 'El carrito no puede estar vacío' };
  }
  
  for (let i = 0; i < cartItems.length; i++) {
    const item = cartItems[i];
    
    if (!item.product_id) {
      return { valid: false, error: `Item ${i + 1}: ID de producto requerido` };
    }
    
    if (!validatePositiveNumber(item.qty)) {
      return { valid: false, error: `Item ${i + 1}: Cantidad debe ser un número positivo` };
    }
    
    if (!validatePositiveNumber(item.price)) {
      return { valid: false, error: `Item ${i + 1}: Precio debe ser un número positivo` };
    }
  }
  
  return { valid: true };
}

// === BÚSQUEDAS Y FILTROS ===

/**
 * Procesa búsquedas de clientes con filtros inteligentes
 */
async function processClientSearch(userId, searchTerm, page = 0) {
  const term = searchTerm?.trim() || '';
  
  // Si no hay término de búsqueda, devolver todos los clientes del usuario
  const result = await db.searchClients(userId, term, page);
  
  // Agregar metadatos útiles
  result.searchTerm = term;
  result.isEmpty = result.clients.length === 0;
  result.isFiltered = term.length > 0;
  
  return result;
}

/**
 * Procesa búsquedas de productos con filtros
 */
async function processProductSearch(searchTerm, page = 0) {
  const term = searchTerm?.trim() || '';
  
  const result = await db.searchProducts(term, page);
  
  // Agregar metadatos útiles
  result.searchTerm = term;
  result.isEmpty = result.products.length === 0;
  result.isFiltered = term.length > 0;
  
  return result;
}

/**
 * Procesa búsquedas de pedidos con múltiples filtros
 */
async function processOrderSearch(filters = {}, page = 0) {
  // Normalizar filtros
  const normalizedFilters = {};
  
  if (filters.fecha) {
    normalizedFilters.fecha = filters.fecha;
  }
  
  if (filters.clienteId) {
    normalizedFilters.clienteId = Number(filters.clienteId);
  }
  
  if (filters.estado) {
    normalizedFilters.estado = filters.estado;
  }
  
  const result = await db.searchOrders(normalizedFilters, page);
  
  // Agregar metadatos
  result.filters = normalizedFilters;
  result.isEmpty = result.orders.length === 0;
  result.isFiltered = Object.keys(normalizedFilters).length > 0;
  
  return result;
}

// === UTILIDADES DE NEGOCIO ===

/**
 * Formatea un pedido para mostrar en el bot
 */
function formatOrderForDisplay(order) {
  const cliente = order.clients?.nombre || 'Cliente desconocido';
  const total = Number(order.total || 0).toFixed(2);
  const fecha = order.fecha || 'Sin fecha';
  const estado = order.estado || 'pendiente';
  
  return {
    id: order.id,
    display: `#${order.id} - ${cliente} | $${total} | ${fecha} | ${estado}`,
    cliente,
    total,
    fecha,
    estado
  };
}

/**
 * Formatea un cliente para mostrar en el bot
 */
function formatClientForDisplay(client) {
  const nombre = client.nombre || 'Sin nombre';
  const contacto = client.contacto ? ` (${client.contacto})` : '';
  const direccion = client.direccion ? ` - ${client.direccion}` : '';
  
  return {
    id: client.id,
    display: `${nombre}${contacto}${direccion}`,
    nombre,
    contacto: client.contacto,
    direccion: client.direccion
  };
}

/**
 * Formatea un producto para mostrar en el bot
 */
function formatProductForDisplay(product) {
  const name = product.name || 'Sin nombre';
  const price = Number(product.price || 0).toFixed(2);
  const category = product.category ? ` [${product.category}]` : '';
  const sku = product.external_id ? ` (${product.external_id})` : '';
  
  return {
    id: product.id,
    display: `${name} - $${price}${category}${sku}`,
    name,
    price: Number(product.price || 0),
    category: product.category,
    sku: product.external_id
  };
}

module.exports = {
  // Clientes
  processClientCreation,
  processClientUpdate,
  processClientSearch,
  formatClientForDisplay,
  
  // Productos
  processProductCreation,
  processProductSearch,
  formatProductForDisplay,
  
  // Pedidos
  processOrderCreation,
  processOrderSearch,
  formatOrderForDisplay,
  calculateCartTotal,
  validateCartItems
};
