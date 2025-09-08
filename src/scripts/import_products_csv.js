/*
  Importa productos desde un CSV a la tabla public.products.
  Uso:
    node src/scripts/import_products_csv.js <ruta_csv> [--source=AppDio]
  Ejemplo:
    node src/scripts/import_products_csv.js "C:/Users/henri/Downloads/products_rows.csv" --source=AppDio
*/

require('dotenv').config();
const fs = require('fs');
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

function parseInteger(v) {
  const s = toNull(v);
  if (s === null) return null;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}

// created_at/deleted_at: dejamos como texto si Postgres puede parsearlo (timestamptz)
function parseTimestamp(v) {
  const s = toNull(v);
  if (s === null) return null;
  return s; // e.g. "2025-07-13 20:17:53.386005+00"
}

async function insertBatch(rows) {
  if (!rows.length) return;
  const { error } = await supabase
    .from('products')
    .upsert(rows, { onConflict: 'source,external_id' });
  if (error) throw error;
}

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Uso: node src/scripts/import_products_csv.js <ruta_csv> [--source=Nombre]');
    process.exit(1);
  }
  const sourceArg = process.argv.find((a) => a.startsWith('--source='));
  const source = sourceArg ? sourceArg.split('=')[1] : 'AppDio';

  if (!fs.existsSync(filePath)) {
    console.error(`No existe el archivo: ${filePath}`);
    process.exit(1);
  }

  console.log(`Importando productos desde: ${filePath}`);

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
    // Encabezados esperados:
    // id,created_at,name_products,description,price,stock,category,supplier_id,image_url,deleted_at
    const rec = {
      source,
      external_id: toNull(row.id),
      name: toNull(row.name_products) || '(sin nombre)',
      description: toNull(row.description),
      price: parseNumber(row.price),
      stock: parseInteger(row.stock),
      category: toNull(row.category),
      supplier_id: toNull(row.supplier_id),
      image_url: toNull(row.image_url),
      created_at: parseTimestamp(row.created_at),
      deleted_at: parseTimestamp(row.deleted_at),
    };

    batch.push(rec);
    if (batch.length >= BATCH_SIZE) {
      parser.pause();
      try {
        await insertBatch(batch);
        total += batch.length;
        console.log(`Insertados ${total} productos...`);
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
      console.log(`Importación de productos finalizada. Total insertados: ${total}`);
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
