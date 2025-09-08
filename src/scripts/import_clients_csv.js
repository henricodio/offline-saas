/*
  Importa clientes desde un CSV a la tabla public.imported_clients.
  Uso:
    node src/scripts/import_clients_csv.js <ruta_csv> [--source=AppDio]
  Ejemplo:
    node src/scripts/import_clients_csv.js "C:/Users/henri/Downloads/Copia de AppDio - Clienti - Copia de AppDio - Clienti(3).csv" --source=AppDio
*/

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse');
const { getSupabaseClient } = require('../bot/supabase');

const supabase = getSupabaseClient();

const BATCH_SIZE = 500;

function toNull(v) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  if (!s || s === '-' || s.toLowerCase() === 'null') return null;
  return s;
}

function parseNumber(v) {
  const s = toNull(v);
  if (s === null) return null;
  const n = Number(String(s).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function parseDate(v) {
  const s = toNull(v);
  if (s === null) return null;
  // Soporta YYYY-MM-DD y DD/MM/YYYY de forma simple
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s; // ISO simple
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) {
    const dd = m[1].padStart(2, '0');
    const mm = m[2].padStart(2, '0');
    let yyyy = m[3];
    if (yyyy.length === 2) yyyy = (Number(yyyy) + 2000).toString();
    return `${yyyy}-${mm}-${dd}`;
  }
  return null; // no forzar fechas inválidas
}

async function insertBatch(rows) {
  if (!rows.length) return;
  // Insertar directamente en public.clients (tabla extendida). Usamos upsert para evitar fallos por duplicados.
  const { error } = await supabase
    .from('clients')
    .upsert(rows, { onConflict: 'source,external_id' });
  if (error) throw error;
}

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Uso: node src/scripts/import_clients_csv.js <ruta_csv> [--source=Nombre]');
    process.exit(1);
  }
  const sourceArg = process.argv.find((a) => a.startsWith('--source='));
  const source = sourceArg ? sourceArg.split('=')[1] : 'AppDio';

  if (!fs.existsSync(filePath)) {
    console.error(`No existe el archivo: ${filePath}`);
    process.exit(1);
  }

  console.log(`Importando CSV: ${filePath}`);

  let total = 0;
  let batch = [];

  const parser = fs
    .createReadStream(filePath)
    .pipe(
      parse({
        columns: true,
        skip_empty_lines: true,
        relax_column_count: true,
        trim: true,
      })
    );

  parser.on('data', async (row) => {
    // Espera encabezados: id,client_name,address,phone,assigned_to,id_fiscal,category,route,start_date,status,last_purchase_date,city,contact_person,discount_percentage,observations
    const rec = {
      // Campos base de clients
      nombre: toNull(row.client_name) || '(sin nombre)',
      contacto: toNull(row.phone),
      direccion: toNull(row.address),
      // Campos extendidos para importación
      source,
      external_id: toNull(row.id),
      phone: toNull(row.phone),
      assigned_to: toNull(row.assigned_to),
      id_fiscal: toNull(row.id_fiscal),
      category: toNull(row.category),
      route: toNull(row.route),
      start_date: parseDate(row.start_date),
      status: toNull(row.status),
      last_purchase_date: parseDate(row.last_purchase_date),
      city: toNull(row.city),
      contact_person: toNull(row.contact_person),
      discount_percentage: parseNumber(row.discount_percentage),
      observations: toNull(row.observations),
    };

    batch.push(rec);
    if (batch.length >= BATCH_SIZE) {
      parser.pause();
      try {
        await insertBatch(batch);
        total += batch.length;
        console.log(`Insertados ${total} registros...`);
        batch = [];
      } catch (e) {
        console.error('Error insertando lote:', e.message);
        process.exit(1);
      } finally {
        parser.resume();
      }
    }
  });

  parser.on('end', async () => {
    try {
      if (batch.length) {
        await insertBatch(batch);
        total += batch.length;
      }
      console.log(`Importación finalizada. Total insertados: ${total}`);
    } catch (e) {
      console.error('Error insertando lote final:', e.message);
      process.exit(1);
    }
  });

  parser.on('error', (err) => {
    console.error('Error al leer CSV:', err.message);
    process.exit(1);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
