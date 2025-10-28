'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Pencil, ShoppingCart, DollarSign, Calendar, User, Package, FileText } from 'lucide-react';

type OrderDetailCardProps = {
  order: {
    id: string;
    cliente_id: string;
    cliente_nombre?: string;
    total: number | null;
    fecha: string | null;
    created_at: string | null;
    estado?: string | null;
  };
  items: Array<{
    id: string;
    nombre_producto: string;
    cantidad: number;
    precio_unitario: number;
    total_linea: number;
  }>;
};

type TabType = 'resumen' | 'items' | 'notas';

export default function OrderDetailCard({ order, items }: OrderDetailCardProps) {
  const [activeTab, setActiveTab] = useState<TabType>('resumen');

  const createdDate = order.created_at ? new Date(order.created_at).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }) : '-';
  const orderDate = order.fecha ? new Date(order.fecha).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }) : createdDate;
  const totalItems = items.reduce((sum, item) => sum + item.cantidad, 0);
  const totalAmount = Number(order.total ?? 0);

  const statusColors: Record<string, { bg: string; text: string; border: string }> = {
    pendiente: { bg: 'bg-yellow-900', text: 'text-yellow-200', border: 'border-yellow-700' },
    en_proceso: { bg: 'bg-blue-900', text: 'text-blue-200', border: 'border-blue-700' },
    completado: { bg: 'bg-green-900', text: 'text-green-200', border: 'border-green-700' },
    cancelado: { bg: 'bg-red-900', text: 'text-red-200', border: 'border-red-700' },
  };

  const status = (order.estado || 'pendiente') as keyof typeof statusColors;
  const colors = statusColors[status] || statusColors.pendiente;

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-950 via-dark-900 to-dark-950 p-4 md:p-6">
      {/* Header con navegación */}
      <div className="mb-6 flex items-center justify-between">
        <Link href="/orders" className="inline-flex items-center gap-2 text-dark-500 hover:text-cyan-400 transition-colors">
          <ArrowLeft size={20} />
          <span className="text-sm font-medium">Volver a pedidos</span>
        </Link>
        <div className="flex gap-2">
          <Link href={`/orders/${order.id}/edit`} className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors">
            <Pencil size={16} />
            <span className="text-sm font-medium">Editar</span>
          </Link>
        </div>
      </div>

      {/* Contenedor principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna izquierda - Información del pedido */}
        <div className="lg:col-span-1 space-y-6">
          {/* Tarjeta de pedido */}
          <div className="bg-gradient-to-br from-dark-800 to-dark-700 rounded-xl p-6 border border-dark-700 shadow-xl">
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold text-white font-mono mb-2">#{order.id.slice(0, 8)}</h1>
                <p className="text-sm text-dark-400">Pedido creado {createdDate}</p>
              </div>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${colors.bg} ${colors.text} border ${colors.border}`}>
                {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
              </span>
            </div>

            {/* Información del cliente */}
            <div className="space-y-3 pt-6 border-t border-dark-600">
              <div className="flex items-center gap-3">
                <User size={18} className="text-cyan-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-dark-400">Cliente</p>
                  <Link href={`/clients/${order.cliente_id}`} className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors truncate">
                    {order.cliente_nombre || 'N/D'}
                  </Link>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Calendar size={18} className="text-cyan-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-dark-400">Fecha del pedido</p>
                  <p className="text-sm text-white">{orderDate}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Package size={18} className="text-cyan-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-dark-400">Total de items</p>
                  <p className="text-sm text-white">{totalItems} producto{totalItems !== 1 ? 's' : ''}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Tarjeta de totales */}
          <div className="bg-gradient-to-br from-dark-800 to-dark-700 rounded-xl p-6 border border-dark-700 shadow-xl space-y-4">
            <h3 className="text-lg font-semibold text-white mb-4">Resumen financiero</h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingCart size={16} className="text-cyan-400" />
                  <span className="text-sm text-dark-300">Subtotal</span>
                </div>
                <span className="text-lg font-bold text-white">${totalAmount.toFixed(2)}</span>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-dark-600">
                <div className="flex items-center gap-2">
                  <DollarSign size={16} className="text-accent-400" />
                  <span className="text-sm font-medium text-dark-300">Total</span>
                </div>
                <span className="text-2xl font-bold text-accent-400">${totalAmount.toFixed(2)}</span>
              </div>
            </div>

            <div className="w-full bg-dark-600 rounded-full h-2 mt-4">
              <div className="bg-gradient-to-r from-accent-400 to-accent-600 h-2 rounded-full" style={{ width: '100%' }} />
            </div>
          </div>
        </div>

        {/* Columna derecha - Pestañas y contenido */}
        <div className="lg:col-span-2">
          <div className="bg-gradient-to-br from-dark-800 to-dark-700 rounded-xl border border-dark-700 shadow-xl overflow-hidden">
            {/* Pestañas */}
            <div className="flex border-b border-dark-600 bg-dark-800/50">
              <button
                onClick={() => setActiveTab('resumen')}
                className={`flex-1 px-4 py-4 text-sm font-medium transition-all ${
                  activeTab === 'resumen'
                    ? 'text-cyan-400 border-b-2 border-cyan-400 bg-dark-700/50'
                    : 'text-dark-400 hover:text-dark-300'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <ShoppingCart size={16} />
                  Resumen
                </div>
              </button>
              <button
                onClick={() => setActiveTab('items')}
                className={`flex-1 px-4 py-4 text-sm font-medium transition-all ${
                  activeTab === 'items'
                    ? 'text-cyan-400 border-b-2 border-cyan-400 bg-dark-700/50'
                    : 'text-dark-400 hover:text-dark-300'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Package size={16} />
                  Items ({items.length})
                </div>
              </button>
              <button
                onClick={() => setActiveTab('notas')}
                className={`flex-1 px-4 py-4 text-sm font-medium transition-all ${
                  activeTab === 'notas'
                    ? 'text-cyan-400 border-b-2 border-cyan-400 bg-dark-700/50'
                    : 'text-dark-400 hover:text-dark-300'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <FileText size={16} />
                  Notas
                </div>
              </button>
            </div>

            {/* Contenido de pestañas */}
            <div className="p-6">
              {activeTab === 'resumen' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white mb-4">Información del pedido</h3>
                  <div className="space-y-3">
                    <div className="p-4 bg-dark-700/50 rounded-lg border border-dark-600">
                      <p className="text-xs text-dark-400 mb-1">ID del pedido</p>
                      <p className="text-sm font-mono text-cyan-400">{order.id}</p>
                    </div>
                    <div className="p-4 bg-dark-700/50 rounded-lg border border-dark-600">
                      <p className="text-xs text-dark-400 mb-1">Cliente</p>
                      <Link href={`/clients/${order.cliente_id}`} className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors">
                        {order.cliente_nombre || 'N/D'} →
                      </Link>
                    </div>
                    <div className="p-4 bg-dark-700/50 rounded-lg border border-dark-600">
                      <p className="text-xs text-dark-400 mb-1">Estado</p>
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${colors.bg} ${colors.text}`}>
                        {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'items' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white mb-4">Productos en el pedido</h3>
                  {items.length === 0 ? (
                    <p className="text-dark-400 text-center py-8">No hay items en este pedido</p>
                  ) : (
                    <div className="space-y-3">
                      {items.map((item) => (
                        <div key={item.id} className="p-4 bg-dark-700/50 rounded-lg border border-dark-600 hover:border-cyan-500 transition-colors">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <p className="font-medium text-white">{item.nombre_producto}</p>
                              <p className="text-xs text-dark-400 mt-1">
                                {item.cantidad} × ${item.precio_unitario.toFixed(2)}
                              </p>
                            </div>
                            <span className="text-lg font-bold text-cyan-400">${item.total_linea.toFixed(2)}</span>
                          </div>
                          <div className="w-full bg-dark-600 rounded-full h-1.5">
                            <div className="bg-gradient-to-r from-cyan-400 to-cyan-600 h-1.5 rounded-full" style={{ width: `${(item.total_linea / totalAmount) * 100}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'notas' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white mb-4">Notas</h3>
                  <div className="p-4 bg-dark-700/50 rounded-lg border border-dark-600 border-dashed">
                    <p className="text-dark-400 text-center text-sm">No hay notas registradas. Agrega notas para recordar detalles importantes sobre este pedido.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
