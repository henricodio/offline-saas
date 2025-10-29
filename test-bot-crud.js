/**
 * Test CRUD de operatividad del bot de Telegram
 * Verifica que todas las funcionalidades principales funcionen correctamente
 */

require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { createClient } = require('@supabase/supabase-js');

const token = process.env.BOT_TOKEN;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE;

if (!token || !supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Faltan variables de entorno (BOT_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_ROLE)');
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: false });
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

// Colores para output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

async function runTests() {
  log(colors.cyan, '\n========================================');
  log(colors.cyan, '🤖 TEST CRUD - BOT DE TELEGRAM');
  log(colors.cyan, '========================================\n');

  let testsPassed = 0;
  let testsFailed = 0;

  try {
    // ========== TEST 1: Conexión a Supabase ==========
    log(colors.blue, '📌 TEST 1: Conexión a Supabase');
    try {
      const { data, error } = await supabase.from('users').select('count', { count: 'exact', head: true });
      if (error) throw error;
      log(colors.green, '✅ Conexión a Supabase exitosa\n');
      testsPassed++;
    } catch (error) {
      log(colors.red, `❌ Error de conexión: ${error.message}\n`);
      testsFailed++;
    }

    // ========== TEST 2: Crear Cliente ==========
    log(colors.blue, '📌 TEST 2: Crear Cliente');
    let clientId = null;
    try {
      const { data, error } = await supabase
        .from('clients')
        .insert({
          nombre: 'Test Cliente CRUD',
          contacto: 'Test Contact',
          phone: '1234567890',
          direccion: 'Calle Test 123',
          city: 'Test City',
          route: 'Ruta Test',
        })
        .select('id')
        .single();

      if (error) throw error;
      clientId = data.id;
      log(colors.green, `✅ Cliente creado: ${clientId}\n`);
      testsPassed++;
    } catch (error) {
      log(colors.red, `❌ Error al crear cliente: ${error.message}\n`);
      testsFailed++;
    }

    // ========== TEST 3: Leer Cliente ==========
    log(colors.blue, '📌 TEST 3: Leer Cliente');
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Cliente no encontrado');
      log(colors.green, `✅ Cliente leído: ${data.nombre}\n`);
      testsPassed++;
    } catch (error) {
      log(colors.red, `❌ Error al leer cliente: ${error.message}\n`);
      testsFailed++;
    }

    // ========== TEST 4: Actualizar Cliente ==========
    log(colors.blue, '📌 TEST 4: Actualizar Cliente');
    try {
      const { data, error } = await supabase
        .from('clients')
        .update({ phone: '9876543210' })
        .eq('id', clientId)
        .select()
        .single();

      if (error) throw error;
      if (data.phone !== '9876543210') throw new Error('Teléfono no actualizado');
      log(colors.green, `✅ Cliente actualizado: ${data.phone}\n`);
      testsPassed++;
    } catch (error) {
      log(colors.red, `❌ Error al actualizar cliente: ${error.message}\n`);
      testsFailed++;
    }

    // ========== TEST 5: Crear Pedido ==========
    log(colors.blue, '📌 TEST 5: Crear Pedido');
    let orderId = null;
    try {
      const { data, error } = await supabase
        .from('orders')
        .insert({
          cliente_id: clientId,
          total: 100.50,
          estado: 'pendiente',
          fecha: new Date().toISOString().split('T')[0],
        })
        .select('id')
        .single();

      if (error) throw error;
      orderId = data.id;
      log(colors.green, `✅ Pedido creado: ${orderId}\n`);
      testsPassed++;
    } catch (error) {
      log(colors.red, `❌ Error al crear pedido: ${error.message}\n`);
      testsFailed++;
    }

    // ========== TEST 6: Leer Pedido ==========
    log(colors.blue, '📌 TEST 6: Leer Pedido');
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Pedido no encontrado');
      log(colors.green, `✅ Pedido leído: $${data.total}\n`);
      testsPassed++;
    } catch (error) {
      log(colors.red, `❌ Error al leer pedido: ${error.message}\n`);
      testsFailed++;
    }

    // ========== TEST 7: Actualizar Pedido ==========
    log(colors.blue, '📌 TEST 7: Actualizar Pedido');
    try {
      const { data, error } = await supabase
        .from('orders')
        .update({ total: 150.00 })
        .eq('id', orderId)
        .select()
        .single();

      if (error) throw error;
      if (data.total !== 150.00) throw new Error('Total no actualizado');
      log(colors.green, `✅ Pedido actualizado: $${data.total}\n`);
      testsPassed++;
    } catch (error) {
      log(colors.red, `❌ Error al actualizar pedido: ${error.message}\n`);
      testsFailed++;
    }

    // ========== TEST 8: Crear Tarea ==========
    log(colors.blue, '📌 TEST 8: Crear Tarea');
    let taskId = null;
    try {
      // Obtener un usuario de prueba
      const { data: users, error: userError } = await supabase
        .from('users')
        .select('id')
        .limit(1);

      if (userError || !users || users.length === 0) {
        throw new Error('No hay usuarios disponibles para crear tarea');
      }

      const userId = users[0].id;

      const { data, error } = await supabase
        .from('tasks')
        .insert({
          user_id: userId,
          title: 'Test Tarea CRUD',
          due_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
          status: 'pending',
        })
        .select('id')
        .single();

      if (error) throw error;
      taskId = data.id;
      log(colors.green, `✅ Tarea creada: ${taskId}\n`);
      testsPassed++;
    } catch (error) {
      log(colors.red, `❌ Error al crear tarea: ${error.message}\n`);
      testsFailed++;
    }

    // ========== TEST 9: Leer Tarea ==========
    log(colors.blue, '📌 TEST 9: Leer Tarea');
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Tarea no encontrada');
      log(colors.green, `✅ Tarea leída: ${data.title}\n`);
      testsPassed++;
    } catch (error) {
      log(colors.red, `❌ Error al leer tarea: ${error.message}\n`);
      testsFailed++;
    }

    // ========== TEST 10: Actualizar Tarea ==========
    log(colors.blue, '📌 TEST 10: Actualizar Tarea');
    try {
      const { data, error } = await supabase
        .from('tasks')
        .update({ status: 'completed' })
        .eq('id', taskId)
        .select()
        .single();

      if (error) throw error;
      if (data.status !== 'completed') throw new Error('Estado no actualizado');
      log(colors.green, `✅ Tarea actualizada: ${data.status}\n`);
      testsPassed++;
    } catch (error) {
      log(colors.red, `❌ Error al actualizar tarea: ${error.message}\n`);
      testsFailed++;
    }

    // ========== TEST 11: Crear Producto ==========
    log(colors.blue, '📌 TEST 11: Crear Producto');
    let productId = null;
    try {
      const { data, error } = await supabase
        .from('products')
        .insert({
          name: 'Test Producto CRUD',
          description: 'Producto de prueba',
          price: 50.00,
          stock: 100,
          category: 'Test',
        })
        .select('id')
        .single();

      if (error) throw error;
      productId = data.id;
      log(colors.green, `✅ Producto creado: ${productId}\n`);
      testsPassed++;
    } catch (error) {
      log(colors.red, `❌ Error al crear producto: ${error.message}\n`);
      testsFailed++;
    }

    // ========== TEST 12: Leer Producto ==========
    log(colors.blue, '📌 TEST 12: Leer Producto');
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Producto no encontrado');
      log(colors.green, `✅ Producto leído: ${data.nombre}\n`);
      testsPassed++;
    } catch (error) {
      log(colors.red, `❌ Error al leer producto: ${error.message}\n`);
      testsFailed++;
    }

    // ========== TEST 13: Actualizar Producto ==========
    log(colors.blue, '📌 TEST 13: Actualizar Producto');
    try {
      const { data, error } = await supabase
        .from('products')
        .update({ price: 75.00 })
        .eq('id', productId)
        .select()
        .single();

      if (error) throw error;
      if (data.price !== 75.00) throw new Error('Precio no actualizado');
      log(colors.green, `✅ Producto actualizado: $${data.price}\n`);
      testsPassed++;
    } catch (error) {
      log(colors.red, `❌ Error al actualizar producto: ${error.message}\n`);
      testsFailed++;
    }

    // ========== TEST 14: Eliminar Tarea ==========
    log(colors.blue, '📌 TEST 14: Eliminar Tarea');
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);

      if (error) throw error;
      log(colors.green, `✅ Tarea eliminada\n`);
      testsPassed++;
    } catch (error) {
      log(colors.red, `❌ Error al eliminar tarea: ${error.message}\n`);
      testsFailed++;
    }

    // ========== TEST 15: Eliminar Pedido ==========
    log(colors.blue, '📌 TEST 15: Eliminar Pedido');
    try {
      const { error } = await supabase.from('orders').delete().eq('id', orderId);

      if (error) throw error;
      log(colors.green, `✅ Pedido eliminado\n`);
      testsPassed++;
    } catch (error) {
      log(colors.red, `❌ Error al eliminar pedido: ${error.message}\n`);
      testsFailed++;
    }

    // ========== TEST 16: Eliminar Producto ==========
    log(colors.blue, '📌 TEST 16: Eliminar Producto');
    try {
      const { error } = await supabase.from('products').delete().eq('id', productId);

      if (error) throw error;
      log(colors.green, `✅ Producto eliminado\n`);
      testsPassed++;
    } catch (error) {
      log(colors.red, `❌ Error al eliminar producto: ${error.message}\n`);
      testsFailed++;
    }

    // ========== TEST 17: Eliminar Cliente ==========
    log(colors.blue, '📌 TEST 17: Eliminar Cliente');
    try {
      const { error } = await supabase.from('clients').delete().eq('id', clientId);

      if (error) throw error;
      log(colors.green, `✅ Cliente eliminado\n`);
      testsPassed++;
    } catch (error) {
      log(colors.red, `❌ Error al eliminar cliente: ${error.message}\n`);
      testsFailed++;
    }

  } catch (error) {
    log(colors.red, `❌ Error general: ${error.message}`);
    testsFailed++;
  }

  // ========== RESUMEN ==========
  log(colors.cyan, '\n========================================');
  log(colors.cyan, '📊 RESUMEN DE TESTS');
  log(colors.cyan, '========================================\n');

  log(colors.green, `✅ Tests Pasados: ${testsPassed}`);
  log(colors.red, `❌ Tests Fallidos: ${testsFailed}`);

  const total = testsPassed + testsFailed;
  const percentage = total > 0 ? ((testsPassed / total) * 100).toFixed(2) : 0;

  log(colors.yellow, `📈 Porcentaje: ${percentage}%\n`);

  if (testsFailed === 0) {
    log(colors.green, '🎉 ¡TODOS LOS TESTS PASARON! El bot está 100% operativo.\n');
    process.exit(0);
  } else {
    log(colors.red, '⚠️ Algunos tests fallaron. Revisa los errores arriba.\n');
    process.exit(1);
  }
}

runTests().catch((error) => {
  log(colors.red, `❌ Error fatal: ${error.message}`);
  process.exit(1);
});
