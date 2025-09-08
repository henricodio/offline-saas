/**
 * Monitor de rendimiento para el bot de Telegram
 */

const { logger } = require('./errorHandler');

class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.startTimes = new Map();
  }

  /**
   * Inicia el seguimiento de una operación
   */
  start(operationId, context, metadata = {}) {
    this.startTimes.set(operationId, {
      startTime: Date.now(),
      context,
      metadata
    });
  }

  /**
   * Finaliza el seguimiento y registra métricas
   */
  end(operationId) {
    const operation = this.startTimes.get(operationId);
    if (!operation) return;

    const duration = Date.now() - operation.startTime;
    const { context, metadata } = operation;

    // Registrar métrica
    logger.performance(context, operationId, duration, metadata);

    // Almacenar para análisis
    if (!this.metrics.has(context)) {
      this.metrics.set(context, []);
    }
    this.metrics.get(context).push({
      operation: operationId,
      duration,
      timestamp: new Date().toISOString(),
      ...metadata
    });

    this.startTimes.delete(operationId);
    return duration;
  }

  /**
   * Obtiene estadísticas de rendimiento
   */
  getStats(context = null) {
    if (context) {
      const contextMetrics = this.metrics.get(context) || [];
      return this.calculateStats(contextMetrics);
    }

    const allStats = {};
    for (const [ctx, metrics] of this.metrics.entries()) {
      allStats[ctx] = this.calculateStats(metrics);
    }
    return allStats;
  }

  /**
   * Calcula estadísticas básicas
   */
  calculateStats(metrics) {
    if (metrics.length === 0) return null;

    const durations = metrics.map(m => m.duration);
    const sum = durations.reduce((a, b) => a + b, 0);
    const avg = sum / durations.length;
    const min = Math.min(...durations);
    const max = Math.max(...durations);

    return {
      count: metrics.length,
      average: Math.round(avg),
      min,
      max,
      total: sum
    };
  }

  /**
   * Limpia métricas antiguas (mantiene últimas 1000 por contexto)
   */
  cleanup() {
    for (const [context, metrics] of this.metrics.entries()) {
      if (metrics.length > 1000) {
        this.metrics.set(context, metrics.slice(-1000));
      }
    }
  }

  /**
   * Wrapper para funciones async con monitoreo automático
   */
  wrap(fn, context, operationName) {
    return async (...args) => {
      const operationId = `${operationName}_${Date.now()}`;
      this.start(operationId, context);
      
      try {
        const result = await fn(...args);
        this.end(operationId);
        return result;
      } catch (error) {
        this.end(operationId);
        throw error;
      }
    };
  }
}

// Instancia global del monitor
const performanceMonitor = new PerformanceMonitor();

// Limpiar métricas cada 5 minutos
setInterval(() => {
  performanceMonitor.cleanup();
}, 5 * 60 * 1000);

module.exports = {
  PerformanceMonitor,
  performanceMonitor
};
