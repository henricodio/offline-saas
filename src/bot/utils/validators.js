/**
 * Validadores centralizados para el bot de Telegram
 */

const { z } = require('zod');

// Esquema para validar totales (acepta string con coma como separador decimal)
const totalSchema = z.preprocess(
  (v) => {
    if (typeof v === 'string') return Number(v.replace(',', '.'));
    return v;
  },
  z.number().nonnegative()
);

/**
 * Valida formato de fecha YYYY-MM-DD
 */
function validateDate(str) {
  return /^\d{4}-\d{2}-\d{2}$/.test(str);
}

/**
 * Valida y parsea entrada de fecha
 * @param {string} s - Entrada del usuario
 * @returns {string|null|'INVALID'} - Fecha válida, null para "-", o "INVALID"
 */
function parseDateInput(s) {
  const t = String(s || '').trim();
  if (!t || t === '-') return null;
  const m = t.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return 'INVALID';
  const d = new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00Z`);
  if (isNaN(d.getTime())) return 'INVALID';
  return `${m[1]}-${m[2]}-${m[3]}`;
}

/**
 * Valida porcentaje (0-100)
 */
function validatePercentage(str) {
  const num = Number(str);
  return !isNaN(num) && num >= 0 && num <= 100;
}

/**
 * Valida que un string no esté vacío después de trim
 */
function validateRequiredText(str) {
  return typeof str === 'string' && str.trim().length > 0;
}

/**
 * Valida email básico
 */
function validateEmail(str) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(str);
}

/**
 * Valida teléfono (formato flexible)
 */
function validatePhone(str) {
  // Acepta números, espacios, guiones, paréntesis, + al inicio
  const phoneRegex = /^[\+]?[\d\s\-\(\)]{7,20}$/;
  return phoneRegex.test(str.trim());
}

/**
 * Valida precio/número positivo
 */
function validatePositiveNumber(str) {
  const num = Number(str.replace(',', '.'));
  return !isNaN(num) && num > 0;
}

/**
 * Valida stock/cantidad (entero no negativo)
 */
function validateStock(str) {
  const num = parseInt(str, 10);
  return !isNaN(num) && num >= 0 && Number.isInteger(num);
}

/**
 * Sanitiza texto para evitar inyecciones
 */
function sanitizeText(str) {
  if (typeof str !== 'string') return '';
  return str.trim().replace(/[<>]/g, '');
}

/**
 * Valida ID numérico
 */
function validateId(str) {
  const num = parseInt(str, 10);
  return !isNaN(num) && num > 0;
}

/**
 * Valida argumentos de comando separados por |
 */
function parseArgs(text) {
  const idx = text.indexOf(' ');
  if (idx === -1) return [];
  return text
    .slice(idx + 1)
    .split('|')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Valida formato de producto para creación rápida
 * Formato: Nombre | Precio | Categoría | SKU | Stock | Descripción
 */
function validateProductFormat(text) {
  const parts = parseArgs(text);
  if (parts.length < 5) {
    return { valid: false, error: 'Formato incorrecto. Debes proporcionar al menos 5 valores separados por |' };
  }
  
  const [name, priceStr, category, sku, stockStr] = parts;
  
  if (!validateRequiredText(name)) {
    return { valid: false, error: 'El nombre es obligatorio' };
  }
  
  if (!validatePositiveNumber(priceStr)) {
    return { valid: false, error: 'El precio debe ser un número positivo' };
  }
  
  if (!validateStock(stockStr)) {
    return { valid: false, error: 'El stock debe ser un número entero no negativo' };
  }
  
  return { valid: true };
}

/**
 * Valida formato de cliente para creación rápida
 * Formato: Nombre | Contacto | Dirección
 */
function validateClientFormat(text) {
  const parts = parseArgs(text);
  if (parts.length < 1) {
    return { valid: false, error: 'Debes proporcionar al menos el nombre del cliente' };
  }
  
  const [name] = parts;
  if (!validateRequiredText(name)) {
    return { valid: false, error: 'El nombre no puede estar vacío' };
  }
  
  return { valid: true };
}

/**
 * Valida formato de pedido para creación rápida
 * Formato: ClienteID | Total | Notas
 */
function validateOrderFormat(text) {
  const parts = parseArgs(text);
  if (parts.length < 2) {
    return { valid: false, error: 'Debes proporcionar ClienteID y Total separados por |' };
  }
  
  const [clientIdStr, totalStr] = parts;
  
  if (!validateId(clientIdStr)) {
    return { valid: false, error: 'El ID del cliente debe ser un número válido' };
  }
  
  if (!validatePositiveNumber(totalStr)) {
    return { valid: false, error: 'El total debe ser un número positivo' };
  }
  
  return { valid: true };
}

/**
 * Esquemas Zod para validación avanzada
 */
const schemas = {
  client: z.object({
    nombre: z.string().min(1, 'Nombre requerido').max(100, 'Nombre muy largo'),
    contacto: z.string().max(100, 'Contacto muy largo').optional().nullable(),
    direccion: z.string().max(200, 'Dirección muy larga').optional().nullable(),
    category: z.string().max(50, 'Categoría muy larga').optional().nullable(),
    route: z.string().max(50, 'Ciudad muy larga').optional().nullable(),
    id_fiscal: z.string().max(50, 'ID fiscal muy largo').optional().nullable(),
    discount_percentage: z.number().min(0).max(100).optional().nullable(),
    observations: z.string().max(500, 'Observaciones muy largas').optional().nullable()
  }),
  
  product: z.object({
    name: z.string().min(1, 'Nombre requerido').max(100, 'Nombre muy largo'),
    price: z.number().positive('Precio debe ser positivo'),
    category: z.string().max(50, 'Categoría muy larga').optional().nullable(),
    external_id: z.string().max(50, 'SKU muy largo').optional().nullable(),
    stock: z.number().int().min(0, 'Stock no puede ser negativo'),
    description: z.string().max(500, 'Descripción muy larga').optional().nullable()
  }),
  
  order: z.object({
    cliente_id: z.number().int().positive('ID cliente requerido'),
    total: totalSchema,
    estado: z.string().max(20, 'Estado muy largo').default('pendiente'),
    notas: z.string().max(500, 'Notas muy largas').optional().nullable()
  })
};

module.exports = {
  // Validadores básicos
  validateDate,
  parseDateInput,
  validatePercentage,
  validateRequiredText,
  validateEmail,
  validatePhone,
  validatePositiveNumber,
  validateStock,
  validateId,
  
  // Utilidades
  sanitizeText,
  parseArgs,
  
  // Validadores de formato
  validateProductFormat,
  validateClientFormat,
  validateOrderFormat,
  
  // Esquemas Zod
  schemas,
  totalSchema
};
