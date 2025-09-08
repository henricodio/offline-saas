require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { getSupabaseClient } = require('./supabase');

// Importar módulos refactorizados
const { initializeCommandHandler, registerCommands } = require('./handlers/commands');
const { initializeCallbackHandler, handleCallbackQuery } = require('./handlers/callbacks');
const { initializeMessageHandler, handleMessage } = require('./handlers/messages');
const { logger } = require('./utils/errorHandler');

const token = process.env.BOT_TOKEN;
if (!token) throw new Error('BOT_TOKEN no configurado en .env');

const bot = new TelegramBot(token, { polling: true });
const supabase = getSupabaseClient();

// Constantes globales
const PAGE_SIZE = 5;
const CLIENTS_PAGE_SIZE = 10;
const OPTIONS_PAGE_SIZE = 10;

// Estado de usuario global
const userState = new Map();

// Utilidades básicas
function fmtDate(s) {
  const d = new Date(s);
  if (isNaN(d.getTime())) return 'N/D';
  return d.toISOString().slice(0, 10);
}

function trunc(str, maxLen) {
  if (!str) return 'N/D';
  return str.length > maxLen ? str.slice(0, maxLen - 1) + '…' : str;
}

function clearState(chatId) {
  userState.delete(chatId);
}

function ensureState(chatId) {
  let st = userState.get(chatId);
  if (!st) {
    st = { flow: null, step: null, data: {}, nav: { stack: [] } };
    userState.set(chatId, st);
  }
  if (!st.nav) st.nav = { stack: [] };
  if (!st.data) st.data = {};
  return st;
}

// === INICIALIZACIÓN ===

async function initializeBot() {
  try {
    // Registrar handlers modulares
    commandHandlers.register(bot, { supabase, userState, keyboards, validators, errorHandler });
    messageHandlers.register(bot, { supabase, userState, keyboards, validators, errorHandler });
    callbackHandlers.register(bot, { supabase, userState, keyboards, validators, errorHandler });
    
    console.log('Bot inicializado correctamente con handlers modulares');
  } catch (error) {
    errorHandler.handleError(error, 'Error inicializando bot');
    process.exit(1);
  }
}

// Inicializar el bot
initializeBot();
