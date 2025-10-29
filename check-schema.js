require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE, {
  auth: { persistSession: false }
});

async function checkSchema() {
  console.log('Verificando esquema de tablas...\n');

  // Clientes
  const { data: clients } = await sb.from('clients').select('*').limit(1);
  console.log('Columnas de clients:', Object.keys(clients?.[0] || {}));

  // Pedidos
  const { data: orders } = await sb.from('orders').select('*').limit(1);
  console.log('Columnas de orders:', Object.keys(orders?.[0] || {}));

  // Productos
  const { data: products } = await sb.from('products').select('*').limit(1);
  console.log('Columnas de products:', Object.keys(products?.[0] || {}));

  // Tareas
  const { data: tasks } = await sb.from('tasks').select('*').limit(1);
  console.log('Columnas de tasks:', Object.keys(tasks?.[0] || {}));
}

checkSchema().catch(console.error);
