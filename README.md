# Plataforma Modular SaaS/MicroSaaS para Vendedores Offline

Este repositorio contiene la Fase 1: Bot de Telegram integrado con Supabase para registrar clientes y pedidos, pensado para trabajo en campo con conexión intermitente.

## Arquitectura Refactorizada

El bot ha sido completamente refactorizado siguiendo principios de arquitectura limpia:

### Estructura Modular

```text
src/bot/
├── index.js              # Punto de entrada y coordinación
├── handlers/             # Manejadores de eventos
│   ├── commands.js       # Comandos del bot (/start, etc.)
│   ├── callbacks.js      # Respuestas a botones inline
│   └── messages.js       # Procesamiento de mensajes
├── services/             # Lógica de negocio y datos
│   ├── database.js       # Operaciones de base de datos
│   └── business.js       # Validaciones y lógica de negocio
├── ui/                   # Componentes de interfaz
│   └── keyboards.js      # Teclados inline y menús
└── utils/                # Utilidades transversales
    ├── errorHandler.js   # Manejo centralizado de errores
    └── performanceMonitor.js # Monitoreo de rendimiento
```

### Características Principales

- **Separación de responsabilidades**: Lógica de negocio separada de handlers UI
- **Manejo robusto de errores**: Sistema centralizado con logging estructurado
- **Monitoreo de rendimiento**: Métricas automáticas de operaciones
- **Validaciones centralizadas**: Esquemas Zod para datos de entrada
- **Arquitectura modular**: Fácil mantenimiento y testing

## Estructura Legacy

- `sql/`: Migraciones de base de datos (Supabase/Postgres)
- `.env.example`: Variables de entorno requeridas
- `package.json`: Scripts y dependencias

## Requisitos

- Node.js 18+
- Proyecto Supabase
- Token de Bot de Telegram

## Variables de entorno

Copiar `.env.example` a `.env` y completar:

```env
BOT_TOKEN=tu_token_de_telegram
SUPABASE_URL=https://<project-ref>.supabase.co
# Preferible para el bot: clave de servicio — mantener segura
SUPABASE_SERVICE_ROLE=tu_clave_service_role
# Alternativa si no usas service role
# SUPABASE_ANON_KEY=tu_clave_anon
```

## Instalación

```bash
npm install
```

## Ejecución

- Desarrollo (recarga con nodemon):

```bash
npm run dev
```

- Producción:

```bash
npm start
```

## Scripts útiles

- `npm run test:bot`: ejecuta un chequeo rápido (variables de entorno, conexión a Supabase y token del bot) sin iniciar polling.
- `npm run check`: alias de `test:bot`.
- `npm run import:clients`: importa clientes desde CSV (ver scripts en `src/scripts/`).
- `npm run import:products`: importa productos (incluye SKU `external_id`).
- `npm run assign:clients-owner`: asigna responsable por `user_id`.

## Comandos del Bot

### Comandos Principales

- `/start`: Registra/inicia al usuario y muestra menú principal
- `/menu`: Muestra el menú principal con todas las opciones

### Flujos Interactivos

- **Gestión de Clientes**: Crear, buscar y editar clientes con flujo guiado
- **Gestión de Pedidos**: Crear pedidos con selección de cliente y productos
- **Inventario**: Administrar productos y stock
- **Consultas de Ventas**: Ver pedidos recientes y por fecha

### Características del Bot

- ✅ Interfaz con botones inline (2 por fila)
- ✅ Flujos guiados paso a paso
- ✅ Validación de datos en tiempo real
- ✅ Manejo robusto de errores
- ✅ Logging y métricas de rendimiento

## Despliegue del esquema (Supabase)

1) Abre el SQL editor de tu proyecto Supabase.
2) Ejecuta las migraciones en este orden (cada archivo por separado):
   - `sql/001_init_schema.sql`
   - `sql/002_imported_clients.sql` (si aplica a tu dataset)
   - `sql/003_extend_clients_for_import.sql` (si aplica)
   - `sql/004_drop_imported_clients.sql` (si aplica)
   - `sql/005_products.sql` (crea `public.products` y columnas para SKU, precio, etc.)
   - `sql/006_add_category_indexes.sql` (índices para `products` y `clients`)
   - `sql/007_order_items.sql` (crea `public.order_items` + trigger que recalcula `orders.total`)
   - `sql/008_add_orders_date_indexes.sql` (índices en `orders(fecha, created_at)` y `orders(cliente_id, created_at)`)
   - `sql/009_orders_with_short_code_view.sql` (vista con `short_code` por `row_number()`)
3) Verifica:
   - Tablas: `users`, `clients`, `orders`, `products`, `order_items`.
   - Trigger: `order_items_recalc_total_trg` existe.
   - Vista: `orders_with_short_code` existe (opcional, pero recomendada).

Notas RLS:

- RLS está habilitado por defecto; el bot usa `SUPABASE_SERVICE_ROLE` (bypassa RLS). Para el canal web/móvil con usuarios autenticados, define políticas más finas.

## Monitoreo y Rendimiento

### Logs Estructurados

El bot incluye un sistema completo de logging con diferentes niveles:

```javascript
// Ejemplos de logs generados automáticamente
[INFO] database: get_user_by_telegram { telegramId: "123456", found: true }
[PERF] database: get_user_123456 { operation: "get_user_123456", duration_ms: 45 }
[USAGE] database: processClientCreation { action: "processClientCreation", clientId: "uuid" }
[ERROR] new_client_flow: ValidationError { message: "Nombre requerido", chatId: 123456 }
```

### Métricas de Rendimiento

- **Operaciones de base de datos** monitoreadas automáticamente
- **Alertas** para operaciones que toman >1000ms
- **Estadísticas** de uso por contexto y operación
- **Cleanup automático** de métricas antiguas cada 5 minutos

### Comandos de Monitoreo

Para verificar el estado del bot en producción:

```bash
# Ver logs en tiempo real
npm run logs

# Verificar sintaxis
npm run check

# Ejecutar en modo debug
NODE_ENV=development npm run dev
```

## Chequeo rápido (smoke test)

Ejecuta:

```bash
npm run test:bot
```

Deberías ver:

- Variables de entorno OK.
- Conexión a Supabase exitosa.
- Bot conectado con `getMe()`.
- Módulos importados e inicializados.

## Flujo de ventas (E2E)

- Búsqueda de productos por texto y por SKU (botón "🔢 Ingresar código").
- Carrito editable: disminuir cantidad y eliminar ítems antes de confirmar.
- Confirmación crea `orders` + `order_items` (trigger recalcula `orders.total`).
- Repetir pedido: en `order:view:<id>` usa "🔁 Repetir" para precargar el carrito desde `order_items`.
- Número corto de pedido: mostrado como `dd/m.aaaa-#secuencia` en listados y detalle.

## UX de navegación

- Teclados inline de 2 columnas (preferencia del usuario) en menús y listados.
- En listado de productos (nueva venta): además de "🔢 Ingresar código" y "🛒 Ver carrito", hay botones "⬅️ Volver" y "🏠 Menú".
- En resultados de inventario: se muestran botones "⬅️ Volver" y "🏠 Menú" para regresar rápidamente.

## Futuro

- App web (Next.js) con administración y reportes
- App móvil (React Native) con cache local y sincronización
- Sincronización bidireccional entre canales
- Dashboard de métricas en tiempo real
