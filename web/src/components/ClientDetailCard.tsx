'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, Phone, MapPin, ShoppingCart, DollarSign, TrendingUp, MessageSquare, FileText, Plus, Pencil, ArrowLeft, Trash2 } from 'lucide-react';
import DeleteConfirmDialog from './DeleteConfirmDialog';

type ClientDetailCardProps = {
  client: {
    id: string;
    nombre: string;
    contacto: string | null;
    phone: string | null;
    direccion: string | null;
    city: string | null;
    route: string | null;
    created_at: string | null;
  };
  stats: {
    ordersCount: number;
    totalSpent: number;
    avgOrder: number;
    lastOrderDate: string | null;
  };
  recentOrders: Array<{
    id: string;
    total: number | null;
    fecha: string | null;
    created_at: string | null;
    estado?: string | null;
  }>;
};

type TabType = 'resumen' | 'interacciones' | 'notas';

export default function ClientDetailCard({ client, stats, recentOrders }: ClientDetailCardProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('resumen');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const createdDate = client.created_at ? new Date(client.created_at).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }) : '-';
  const tel = (client.phone || '').replace(/[^+\d]/g, '');
  const waLink = tel ? `https://wa.me/${tel.replace(/^\+/, '')}` : null;
  const mapsLink = client.direccion ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(client.direccion)}` : null;

  const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="min-h-screen bg-white p-4 md:p-6">
      {/* Header con navegación */}
      <div className="mb-6 flex items-center justify-between">
        <Link href="/clients" className="inline-flex items-center gap-2 text-gray-600 hover:text-orange-600 transition-colors">
          <ArrowLeft size={20} />
          <span className="text-sm font-medium">Volver a clientes</span>
        </Link>
        <div className="flex gap-2">
          <Link href={`/clients/${client.id}/edit`} className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors">
            <Pencil size={16} />
            <span className="text-sm font-medium">Editar</span>
          </Link>
          <Link href="/orders/new" className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors">
            <Plus size={16} />
            <span className="text-sm font-medium">Nuevo pedido</span>
          </Link>
          <button
            onClick={() => setShowDeleteDialog(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            <Trash2 size={16} />
            <span className="text-sm font-medium">Eliminar</span>
          </button>
        </div>
      </div>

      {/* Contenedor principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna izquierda - Perfil y métricas */}
        <div className="lg:col-span-1 space-y-6">
          {/* Tarjeta de perfil */}
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-orange-600 flex items-center justify-center text-white text-2xl font-bold">
                {client.nombre.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold text-gray-900 truncate">{client.nombre}</h1>
                <p className="text-sm text-gray-500">Cliente desde {createdDate}</p>
              </div>
            </div>

            {/* Información de contacto */}
            <div className="space-y-3 pt-6 border-t border-gray-200">
              {client.contacto && (
                <div className="flex items-center gap-3 text-gray-700 hover:text-orange-600 transition-colors">
                  <Mail size={18} className="text-orange-600 flex-shrink-0" />
                  <a href={`mailto:${client.contacto}`} className="text-sm truncate hover:underline">
                    {client.contacto}
                  </a>
                </div>
              )}
              {client.phone && (
                <div className="flex items-center gap-3 text-gray-700">
                  <Phone size={18} className="text-orange-600 flex-shrink-0" />
                  <div className="flex gap-2 text-sm">
                    <a href={`tel:${client.phone}`} className="hover:text-orange-600 transition-colors">
                      {client.phone}
                    </a>
                    {waLink && (
                      <a href={waLink} target="_blank" rel="noopener noreferrer" className="text-green-400 hover:text-green-300 transition-colors">
                        (WhatsApp)
                      </a>
                    )}
                  </div>
                </div>
              )}
              {client.direccion && (
                <div className="flex items-start gap-3 text-gray-700">
                  <MapPin size={18} className="text-orange-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p>{client.direccion}</p>
                    {client.city && <p className="text-gray-500">{client.city}</p>}
                    {mapsLink && (
                      <a href={mapsLink} target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:text-orange-700 transition-colors text-xs mt-1 inline-block">
                        Ver en Google Maps →
                      </a>
                    )}
                  </div>
                </div>
              )}
              {client.route && (
                <div className="flex items-center gap-3 text-gray-700">
                  <TrendingUp size={18} className="text-orange-600 flex-shrink-0" />
                  <span className="text-sm">Ruta: {client.route}</span>
                </div>
              )}
            </div>
          </div>

          {/* Tarjeta de métricas */}
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Métricas</h3>

            {/* Pedidos totales */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <ShoppingCart size={16} className="text-orange-600" />
                  <span className="text-sm text-gray-700">Pedidos totales</span>
                </div>
                <span className="text-2xl font-bold text-gray-900">{stats.ordersCount}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-orange-600 h-2 rounded-full" style={{ width: `${Math.min(100, (stats.ordersCount / 50) * 100)}%` }} />
              </div>
            </div>

            {/* Total gastado */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <DollarSign size={16} className="text-orange-600" />
                  <span className="text-sm text-gray-700">Total gastado</span>
                </div>
                <span className="text-2xl font-bold text-gray-900">${fmt(stats.totalSpent)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-orange-600 h-2 rounded-full" style={{ width: `${Math.min(100, (stats.totalSpent / 10000) * 100)}%` }} />
              </div>
            </div>

            {/* Ticket promedio */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <TrendingUp size={16} className="text-orange-600" />
                  <span className="text-sm text-gray-700">Ticket promedio</span>
                </div>
                <span className="text-2xl font-bold text-gray-900">${fmt(stats.avgOrder)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-orange-600 h-2 rounded-full" style={{ width: `${Math.min(100, (stats.avgOrder / 1000) * 100)}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Columna derecha - Pestañas y contenido */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Pestañas */}
            <div className="flex border-b border-gray-200 bg-gray-50">
              <button
                onClick={() => setActiveTab('resumen')}
                className={`flex-1 px-4 py-4 text-sm font-medium transition-all ${
                  activeTab === 'resumen'
                    ? 'text-orange-600 border-b-2 border-orange-600 bg-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <ShoppingCart size={16} />
                  Resumen
                </div>
              </button>
              <button
                onClick={() => setActiveTab('interacciones')}
                className={`flex-1 px-4 py-4 text-sm font-medium transition-all ${
                  activeTab === 'interacciones'
                    ? 'text-orange-600 border-b-2 border-orange-600 bg-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <MessageSquare size={16} />
                  Interacciones
                </div>
              </button>
              <button
                onClick={() => setActiveTab('notas')}
                className={`flex-1 px-4 py-4 text-sm font-medium transition-all ${
                  activeTab === 'notas'
                    ? 'text-orange-600 border-b-2 border-orange-600 bg-white'
                    : 'text-gray-600 hover:text-gray-900'
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
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Últimos pedidos</h3>
                  {recentOrders.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No hay pedidos registrados</p>
                  ) : (
                    <div className="space-y-3">
                      {recentOrders.map((order) => (
                        <Link
                          key={order.id}
                          href={`/orders/${order.id}`}
                          className="block p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200 hover:border-orange-400"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-mono text-sm text-orange-600">#{order.id.slice(0, 8)}</span>
                            <span className={`text-xs font-medium px-2 py-1 rounded ${
                              order.estado === 'completado' ? 'bg-green-900 text-green-200' :
                              order.estado === 'pendiente' ? 'bg-yellow-900 text-yellow-200' :
                              order.estado === 'en_proceso' ? 'bg-blue-900 text-blue-200' :
                              'bg-red-900 text-red-200'
                            }`}>
                              {(order.estado || 'pendiente').charAt(0).toUpperCase() + (order.estado || 'pendiente').slice(1).replace('_', ' ')}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-xs text-gray-500">{order.fecha ?? order.created_at?.slice(0, 10) ?? '-'}</span>
                            <span className="text-gray-900 font-semibold">${(Number(order.total ?? 0)).toFixed(2)}</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'interacciones' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Historial de interacciones</h3>
                  <div className="space-y-3">
                    {recentOrders.map((order) => (
                      <div key={order.id} className="flex gap-4 pb-4 border-b border-gray-200 last:border-0">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 rounded-full bg-orange-600 flex items-center justify-center">
                            <ShoppingCart size={16} className="text-white" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">Pedido creado</p>
                          <p className="text-xs text-gray-500">{order.fecha ?? order.created_at?.slice(0, 10) ?? '-'}</p>
                          <p className="text-sm text-orange-600 mt-1">${(Number(order.total ?? 0)).toFixed(2)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'notas' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Notas</h3>
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 border-dashed">
                    <p className="text-gray-500 text-center py-8">No hay notas registradas. Agrega notas para recordar detalles importantes sobre este cliente.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        isOpen={showDeleteDialog}
        title="Eliminar cliente"
        description={`¿Estás seguro de que deseas eliminar a ${client.nombre}? Esta acción no se puede deshacer.`}
        itemName={client.nombre}
        tableName="clients"
        itemId={client.id}
        onClose={() => setShowDeleteDialog(false)}
        onSuccess={() => router.push('/clients')}
      />
    </div>
  );
}
