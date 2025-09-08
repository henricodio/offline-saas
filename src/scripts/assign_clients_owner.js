/*
  Asigna usuario_responsable_id a registros de public.clients.
  Uso:
    node src/scripts/assign_clients_owner.js --user-id=<UUID> [--all]
  - Por defecto solo asigna a clientes con usuario_responsable_id IS NULL.
  - Con --all asigna a TODOS los clientes (sobrescribe responsable existente).
*/

require('dotenv').config();
const { getSupabaseClient } = require('../bot/supabase');

async function main() {
  const argv = process.argv.slice(2);
  let userId = null;

  // Formatos aceptados: --user-id=<uuid>, --user-id <uuid>, -u=<uuid>, -u <uuid>
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--user-id' || a === '-u') {
      userId = argv[i + 1];
      break;
    }
    if (a.startsWith('--user-id=')) {
      userId = a.split('=')[1];
      break;
    }
    if (a.startsWith('-u=')) {
      userId = a.split('=')[1];
      break;
    }
  }
  // NPM puede reescribir flags a variables de entorno npm_config_* (p.ej. npm_config_user_id)
  if (!userId) {
    userId = process.env.npm_config_user_id || process.env.USER_ID || null;
  }
  if (!userId) {
    console.error('Uso: node src/scripts/assign_clients_owner.js --user-id <UUID> [--all]\nAlias: -u <UUID>  |  Variables: USER_ID=<UUID>');
    process.exit(1);
  }
  const assignAll = argv.includes('--all') || argv.includes('-a') || String(process.env.npm_config_all).toLowerCase() === 'true';

  if (!/^([0-9a-fA-F-]{36})$/.test(userId)) {
    console.error('El --user-id no parece un UUID válido.');
    process.exit(1);
  }

  const supabase = getSupabaseClient();
  console.log(`Asignando usuario_responsable_id=${userId} a clients ${assignAll ? '(TODOS)' : '(solo NULL)'}...`);

  try {
    // Validar que el usuario exista
    const { data: userRow, error: userErr } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();
    if (userErr || !userRow) {
      console.error('El usuario especificado no existe en public.users. Aborta.');
      process.exit(1);
    }
    let query = supabase.from('clients').update({ usuario_responsable_id: userId });
    if (!assignAll) {
      query = query.is('usuario_responsable_id', null);
    }
    const { data, error } = await query.select('id');
    if (error) throw error;
    const updated = Array.isArray(data) ? data.length : 0;
    console.log(`Actualizados ${updated} registros.`);
  } catch (e) {
    console.error('Error al asignar responsables:', e.message || e);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
