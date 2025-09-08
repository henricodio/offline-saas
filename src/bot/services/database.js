/**
 * Servicio centralizado para operaciones de base de datos
 * Separa la lógica de negocio de los handlers del bot
 */

const { logger } = require('../utils/errorHandler');
const { performanceMonitor } = require('../utils/performanceMonitor');

let supabase;

function initializeDatabase(supabaseClient) {
  supabase = supabaseClient;
}

// === USUARIOS ===

/**
 * Obtiene o crea un usuario basado en datos de Telegram
 */
async function ensureUserByTelegram(telegramUser) {
  const telegramId = String(telegramUser.id);
  
  // Buscar usuario existente
  const operationId = `get_user_${telegramId}`;
  performanceMonitor.start(operationId, 'database', { telegramId });
  
  try {
    const { data: existing, error: findError } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', telegramId)
      .single();
      
    if (findError && findError.code !== 'PGRST116') {
      throw findError;
    }

    if (existing) {
      performanceMonitor.end(operationId);
      return existing;
    }

    // Crear nuevo usuario
    const userData = {
      telegram_id: telegramId,
      nombre: telegramUser.first_name || 'Usuario',
      username: telegramUser.username || null,
      activo: true
    };

    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert(userData)
      .select('*')
      .single();
      
    if (createError) {
      throw createError;
    }
    
    performanceMonitor.end(operationId);
    logger.info('user_created', `Nuevo usuario registrado: ${newUser.nombre}`, { 
      telegramId, 
      userId: newUser.id 
    });
    
    return newUser;
  } catch (error) {
    performanceMonitor.end(operationId);
    logger.error('database_ensure_user', error, { telegramId });
    throw error;
  }
}

/**
 * Obtiene un usuario por su telegram_id
 */
async function getUserByTelegramId(telegramId) {
  const { data, error } = await supabase
    .from('users')
    .select('id, nombre, username, activo')
    .eq('telegram_id', String(telegramId))
    .single();
    
  if (error) throw error;
  return data;
}

// === CLIENTES ===

/**
 * Busca clientes con paginación
 */
async function searchClients(userId, searchTerm = '', page = 0, pageSize = 10) {
  let query = supabase
    .from('clients')
    .select('id, nombre, contacto, direccion, category, route', { count: 'exact' })
    .eq('usuario_responsable_id', userId)
    .order('nombre', { ascending: true });
    
  if (searchTerm) {
    const like = `%${searchTerm}%`;
    query = query.or(`nombre.ilike.${like},contacto.ilike.${like},direccion.ilike.${like}`);
  }
  
  const from = page * pageSize;
  const to = from + pageSize - 1;
  
  const { data, count, error } = await query.range(from, to);
  
  if (error) throw error;
  
  return {
    clients: data || [],
    total: count || 0,
    page,
    pageSize,
    hasMore: (page + 1) * pageSize < (count || 0)
  };
}

/**
 * Obtiene un cliente por ID
 */
async function getClientById(clientId) {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .single();
    
  if (error) throw error;
  return data;
}

/**
 * Crea un nuevo cliente
 */
async function createClient(clientData, userId) {
  const insertData = {
    ...clientData,
    usuario_responsable_id: userId
  };
  
  const { data, error } = await supabase
    .from('clients')
    .insert(insertData)
    .select('*')
    .single();
    
  if (error) throw error;
  
  logger.info('client_created', `Cliente creado: ${data.nombre}`, { 
    clientId: data.id, 
    userId 
  });
  
  return data;
}

/**
 * Actualiza un cliente existente
 */
async function updateClient(clientId, updates) {
  const { data, error } = await supabase
    .from('clients')
    .update(updates)
    .eq('id', clientId)
    .select('*')
    .single();
    
  if (error) throw error;
  
  logger.info('client_updated', `Cliente actualizado: ${data.nombre}`, { 
    clientId: data.id 
  });
  
  return data;
}

// === PRODUCTOS ===

/**
 * Busca productos con paginación
 */
async function searchProducts(searchTerm = '', page = 0, pageSize = 10) {
  let query = supabase
    .from('products')
    .select('id, name, price, category, external_id, stock, description', { count: 'exact' })
    .order('name', { ascending: true });
    
  if (searchTerm) {
    const like = `%${searchTerm}%`;
    query = query.or(`name.ilike.${like},category.ilike.${like},external_id.ilike.${like}`);
  }
  
  const from = page * pageSize;
  const to = from + pageSize - 1;
  
  const { data, count, error } = await query.range(from, to);
  
  if (error) throw error;
  
  return {
    products: data || [],
    total: count || 0,
    page,
    pageSize,
    hasMore: (page + 1) * pageSize < (count || 0)
  };
}

/**
 * Obtiene un producto por ID
 */
async function getProductById(productId) {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .single();
    
  if (error) throw error;
  return data;
}

/**
 * Crea un nuevo producto
 */
async function createProduct(productData) {
  const { data, error } = await supabase
    .from('products')
    .insert(productData)
    .select('*')
    .single();
    
  if (error) throw error;
  
  logger.info('product_created', `Producto creado: ${data.name}`, { 
    productId: data.id 
  });
  
  return data;
}

// === PEDIDOS ===

/**
 * Busca pedidos con paginación
 */
async function searchOrders(filters = {}, page = 0, pageSize = 5) {
  let query = supabase
    .from('orders')
    .select('id, fecha, estado, total, cliente_id, clients(nombre)', { count: 'exact' })
    .order('created_at', { ascending: false });
    
  // Aplicar filtros
  if (filters.fecha) {
    query = query.eq('fecha', filters.fecha);
  }
  
  if (filters.clienteId) {
    query = query.eq('cliente_id', filters.clienteId);
  }
  
  if (filters.estado) {
    query = query.eq('estado', filters.estado);
  }
  
  const from = page * pageSize;
  const to = from + pageSize - 1;
  
  const { data, count, error } = await query.range(from, to);
  
  if (error) throw error;
  
  return {
    orders: data || [],
    total: count || 0,
    page,
    pageSize,
    hasMore: (page + 1) * pageSize < (count || 0)
  };
}

/**
 * Obtiene un pedido por ID con detalles
 */
async function getOrderById(orderId) {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      clients(nombre, contacto, direccion),
      order_items(
        id, cantidad, precio_unitario,
        products(name, category, external_id)
      )
    `)
    .eq('id', orderId)
    .single();
    
  if (error) throw error;
  return data;
}

/**
 * Crea un nuevo pedido
 */
async function createOrder(orderData, userId) {
  const insertData = {
    ...orderData,
    usuario_creador_id: userId,
    fecha: orderData.fecha || new Date().toISOString().slice(0, 10)
  };
  
  const { data, error } = await supabase
    .from('orders')
    .insert(insertData)
    .select('*')
    .single();
    
  if (error) throw error;
  
  logger.info('order_created', `Pedido creado: #${data.id}`, { 
    orderId: data.id, 
    clienteId: data.cliente_id,
    total: data.total,
    userId 
  });
  
  return data;
}

/**
 * Crea items de pedido en lote
 */
async function createOrderItems(orderId, items) {
  const insertData = items.map(item => ({
    order_id: orderId,
    product_id: item.product_id,
    cantidad: item.cantidad,
    precio_unitario: item.precio_unitario
  }));
  
  const { data, error } = await supabase
    .from('order_items')
    .insert(insertData)
    .select('*');
    
  if (error) throw error;
  
  logger.info('order_items_created', `${items.length} items creados para pedido #${orderId}`, { 
    orderId,
    itemCount: items.length 
  });
  
  return data;
}

// === UTILIDADES ===

/**
 * Obtiene opciones únicas de una columna (para categorías, ciudades, etc.)
 */
async function getUniqueOptions(table, column, limit = 20) {
  const { data, error } = await supabase
    .from(table)
    .select(column)
    .not(column, 'is', null)
    .limit(limit);
    
  if (error) throw error;
  
  // Extraer valores únicos
  const uniqueValues = [...new Set(data.map(row => row[column]))];
  return uniqueValues.filter(Boolean).sort();
}

module.exports = {
  initializeDatabase,
  
  // Usuarios
  ensureUserByTelegram,
  getUserByTelegramId,
  
  // Clientes
  searchClients,
  getClientById,
  createClient,
  updateClient,
  
  // Productos
  searchProducts,
  getProductById,
  createProduct,
  
  // Pedidos
  searchOrders,
  getOrderById,
  createOrder,
  createOrderItems,
  
  // Utilidades
  getUniqueOptions
};
