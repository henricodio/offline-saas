'use client';

import { useEffect, useState } from 'react';
import { MessageCircle, RefreshCw, AlertCircle } from 'lucide-react';

interface SyncStats {
  clients: number;
  orders: number;
  products: number;
  lastSync: string;
}

export default function BotSyncStatus() {
  const [stats, setStats] = useState<SyncStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/bot-sync?action=stats');
      const data = await response.json();

      if (data.ok) {
        setStats(data.stats);
      } else {
        setError(data.error || 'Error fetching stats');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000); // Actualizar cada 30 segundos
    return () => clearInterval(interval);
  }, []);

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
        <AlertCircle className="text-red-600" size={20} />
        <div>
          <p className="text-sm font-medium text-red-900">Error de sincronización</p>
          <p className="text-xs text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <MessageCircle className="text-blue-600" size={20} />
          <h3 className="font-semibold text-gray-900">Estado del Bot</h3>
        </div>
        <button
          onClick={fetchStats}
          disabled={loading}
          className="p-1 hover:bg-blue-100 rounded-md transition-colors disabled:opacity-50"
          title="Actualizar"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading && !stats ? (
        <div className="text-sm text-gray-600">Cargando...</div>
      ) : stats ? (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded p-3 border border-blue-100">
            <p className="text-xs text-gray-600 mb-1">Clientes</p>
            <p className="text-2xl font-bold text-blue-600">{stats.clients}</p>
          </div>
          <div className="bg-white rounded p-3 border border-blue-100">
            <p className="text-xs text-gray-600 mb-1">Pedidos</p>
            <p className="text-2xl font-bold text-blue-600">{stats.orders}</p>
          </div>
          <div className="bg-white rounded p-3 border border-blue-100">
            <p className="text-xs text-gray-600 mb-1">Productos</p>
            <p className="text-2xl font-bold text-blue-600">{stats.products}</p>
          </div>
        </div>
      ) : null}

      {stats && (
        <p className="text-xs text-gray-500 mt-3">
          Última sincronización: {new Date(stats.lastSync).toLocaleTimeString('es-ES')}
        </p>
      )}

      <div className="mt-3 p-2 bg-blue-100 rounded text-xs text-blue-800">
        💡 El bot de Telegram está sincronizado con esta web. Cualquier cambio se refleja automáticamente.
      </div>
    </div>
  );
}
