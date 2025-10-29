require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE, {
  auth: { persistSession: false }
});

async function checkStates() {
  const { data } = await sb.from('orders').select('estado').limit(10);
  console.log('Estados de pedidos existentes:', [...new Set(data?.map(d => d.estado))]);
}

checkStates().catch(console.error);
