/**
 * Manejo centralizado de errores para el bot de Telegram
 */

/**
 * Crea un manejador de errores contextual
 * @param {TelegramBot} bot - Instancia del bot
 * @param {string} context - Contexto donde ocurre el error
 * @returns {Function} Función manejadora de errores
 */
function createErrorHandler(bot, context) {
  return async (error, chatId = null, customMessage = null) => {
    // Log estructurado del error
    console.error(`[ERROR] ${context}:`, {
      message: error.message,
      stack: error.stack,
      chatId,
      timestamp: new Date().toISOString()
    });

    // Si hay chatId, enviar mensaje de error al usuario
    if (chatId && bot) {
      const userMessage = customMessage || `Error en ${context}. Intenta nuevamente.`;
      try {
        await bot.sendMessage(chatId, userMessage);
      } catch (sendError) {
        console.error(`[ERROR] No se pudo enviar mensaje de error:`, sendError.message);
      }
    }
  };
}

/**
 * Wrapper para funciones async que maneja errores automáticamente
 * @param {Function} fn - Función a ejecutar
 * @param {Function} errorHandler - Manejador de errores
 * @param {number} chatId - ID del chat (opcional)
 * @returns {Function} Función envuelta
 */
function withErrorHandling(fn, errorHandler, chatId = null) {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      await errorHandler(error, chatId);
      return null;
    }
  };
}

/**
 * Manejador específico para errores de base de datos
 */
function createDbErrorHandler(bot, context) {
  return async (error, chatId = null) => {
    console.error(`[DB_ERROR] ${context}:`, {
      message: error.message,
      code: error.code,
      details: error.details,
      chatId,
      timestamp: new Date().toISOString()
    });

    if (chatId && bot) {
      const userMessage = `Error de base de datos en ${context}. El equipo técnico ha sido notificado.`;
      try {
        await bot.sendMessage(chatId, userMessage);
      } catch (sendError) {
        console.error(`[ERROR] No se pudo enviar mensaje de error DB:`, sendError.message);
      }
    }
  };
}

/**
 * Manejador específico para errores de validación
 */
function createValidationErrorHandler(bot) {
  return async (error, chatId, fieldName = 'campo') => {
    console.warn(`[VALIDATION_ERROR] ${fieldName}:`, {
      message: error.message,
      chatId,
      timestamp: new Date().toISOString()
    });

    if (chatId && bot) {
      const userMessage = `Error de validación en ${fieldName}: ${error.message}`;
      try {
        await bot.sendMessage(chatId, userMessage);
      } catch (sendError) {
        console.error(`[ERROR] No se pudo enviar mensaje de validación:`, sendError.message);
      }
    }
  };
}

/**
 * Manejador para errores de callback query
 */
function createCallbackErrorHandler(bot) {
  return async (error, query, context = 'callback') => {
    console.error(`[CALLBACK_ERROR] ${context}:`, {
      message: error.message,
      callbackData: query?.data,
      chatId: query?.message?.chat?.id,
      timestamp: new Date().toISOString()
    });

    if (query && bot) {
      try {
        await bot.answerCallbackQuery(query.id, { 
          text: 'Error procesando acción', 
          show_alert: false 
        });
        
        if (query.message?.chat?.id) {
          await bot.sendMessage(
            query.message.chat.id, 
            `Error en ${context}. Intenta nuevamente.`
          );
        }
      } catch (sendError) {
        console.error(`[ERROR] No se pudo responder callback error:`, sendError.message);
      }
    }
  };
}

/**
 * Utilidad para limpiar estado en caso de error crítico
 */
function createStateCleanupHandler(userState, clearState) {
  return (chatId, context = 'error') => {
    try {
      if (userState && typeof clearState === 'function') {
        clearState(chatId);
        console.info(`[CLEANUP] Estado limpiado para chat ${chatId} en contexto: ${context}`);
      }
    } catch (cleanupError) {
      console.error(`[CLEANUP_ERROR] No se pudo limpiar estado:`, cleanupError.message);
    }
  };
}

/**
 * Logger estructurado para diferentes niveles con métricas de rendimiento
 */
const logger = {
  error: (context, error, metadata = {}) => {
    console.error(`[ERROR] ${context}:`, {
      message: error.message,
      stack: error.stack,
      ...metadata,
      timestamp: new Date().toISOString()
    });
  },
  
  warn: (context, message, metadata = {}) => {
    console.warn(`[WARN] ${context}:`, {
      message,
      ...metadata,
      timestamp: new Date().toISOString()
    });
  },
  
  info: (context, message, metadata = {}) => {
    console.info(`[INFO] ${context}:`, {
      message,
      ...metadata,
      timestamp: new Date().toISOString()
    });
  },
  
  debug: (context, message, metadata = {}) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[DEBUG] ${context}:`, {
        message,
        ...metadata,
        timestamp: new Date().toISOString()
      });
    }
  },

  // Métricas de rendimiento
  performance: (context, operation, duration, metadata = {}) => {
    const level = duration > 1000 ? 'WARN' : 'INFO';
    console[level.toLowerCase()](`[PERF] ${context}:`, {
      operation,
      duration_ms: duration,
      ...metadata,
      timestamp: new Date().toISOString()
    });
  },

  // Métricas de uso
  usage: (context, action, metadata = {}) => {
    console.info(`[USAGE] ${context}:`, {
      action,
      ...metadata,
      timestamp: new Date().toISOString()
    });
  }
};

module.exports = {
  createErrorHandler,
  withErrorHandling,
  createDbErrorHandler,
  createValidationErrorHandler,
  createCallbackErrorHandler,
  createStateCleanupHandler,
  logger
};
