'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Pencil, DollarSign, Package, Barcode, Tag, TrendingUp, FileText, AlertCircle } from 'lucide-react';

type ProductDetailCardProps = {
  product: {
    id: string;
    name: string;
    price: number | null;
    stock: number | null;
    category: string | null;
    external_id: string | null;
    created_at: string | null;
  };
  stats?: {
    totalSold?: number;
    totalRevenue?: number;
    lastSold?: string | null;
  };
};

type TabType = 'resumen' | 'estadisticas' | 'notas';

export default function ProductDetailCard({ product, stats }: ProductDetailCardProps) {
  const [activeTab, setActiveTab] = useState<TabType>('resumen');

  const createdDate = product.created_at ? new Date(product.created_at).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }) : '-';
  const price = Number(product.price ?? 0);
  const stock = product.stock ?? 0;
  const isOutOfStock = stock <= 0;
  const isLowStock = stock > 0 && stock <= 20;

  const stockStatus = isOutOfStock ? 'Agotado' : isLowStock ? 'Bajo stock' : 'En stock';
  const stockColor = isOutOfStock ? 'text-red-400' : isLowStock ? 'text-yellow-400' : 'text-green-400';
  const stockBg = isOutOfStock ? 'bg-red-900' : isLowStock ? 'bg-yellow-900' : 'bg-green-900';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-6">
      {/* Header con navegación */}
      <div className="mb-6 flex items-center justify-between">
        <Link href="/products" className="inline-flex items-center gap-2 text-slate-400 hover:text-teal-400 transition-colors">
          <ArrowLeft size={20} />
          <span className="text-sm font-medium">Volver a productos</span>
        </Link>
        <div className="flex gap-2">
          <Link href={`/products/${product.id}/edit`} className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors">
            <Pencil size={16} />
            <span className="text-sm font-medium">Editar</span>
          </Link>
        </div>
      </div>

      {/* Contenedor principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna izquierda - Información del producto */}
        <div className="lg:col-span-1 space-y-6">
          {/* Tarjeta de producto */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl p-6 border border-slate-700 shadow-xl">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-teal-400 to-blue-600 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
                {product.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold text-white truncate">{product.name}</h1>
                <p className="text-sm text-slate-400 mt-1">Producto creado {createdDate}</p>
              </div>
            </div>

            {/* Información del producto */}
            <div className="space-y-3 pt-6 border-t border-slate-600">
              {product.external_id && (
                <div className="flex items-center gap-3">
                  <Barcode size={18} className="text-teal-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-400">SKU</p>
                    <p className="text-sm font-mono text-white">{product.external_id}</p>
                  </div>
                </div>
              )}

              {product.category && (
                <div className="flex items-center gap-3">
                  <Tag size={18} className="text-teal-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-400">Categoría</p>
                    <p className="text-sm text-white">{product.category}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <Package size={18} className="text-teal-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-slate-400">Stock</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-sm font-bold ${stockColor}`}>{stock}</span>
                    <span className={`text-xs font-medium px-2 py-1 rounded ${stockBg} ${stockColor}`}>
                      {stockStatus}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tarjeta de precio */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl p-6 border border-slate-700 shadow-xl space-y-4">
            <h3 className="text-lg font-semibold text-white mb-4">Información financiera</h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign size={16} className="text-green-400" />
                  <span className="text-sm text-slate-300">Precio unitario</span>
                </div>
                <span className="text-2xl font-bold text-green-400">${price.toFixed(2)}</span>
              </div>

              {stats?.totalRevenue !== undefined && (
                <div className="flex items-center justify-between pt-3 border-t border-slate-600">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={16} className="text-blue-400" />
                    <span className="text-sm text-slate-300">Ingresos totales</span>
                  </div>
                  <span className="text-lg font-bold text-blue-400">${(stats.totalRevenue ?? 0).toFixed(2)}</span>
                </div>
              )}
            </div>

            <div className="w-full bg-slate-600 rounded-full h-2 mt-4">
              <div className="bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full" style={{ width: '100%' }} />
            </div>
          </div>

          {/* Alerta de stock bajo */}
          {isLowStock && (
            <div className="bg-yellow-900/30 border border-yellow-700 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle size={20} className="text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-200">Stock bajo</p>
                <p className="text-xs text-yellow-300 mt-1">Quedan solo {stock} unidades en inventario</p>
              </div>
            </div>
          )}

          {isOutOfStock && (
            <div className="bg-red-900/30 border border-red-700 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-200">Producto agotado</p>
                <p className="text-xs text-red-300 mt-1">Este producto no tiene stock disponible</p>
              </div>
            </div>
          )}
        </div>

        {/* Columna derecha - Pestañas y contenido */}
        <div className="lg:col-span-2">
          <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl border border-slate-700 shadow-xl overflow-hidden">
            {/* Pestañas */}
            <div className="flex border-b border-slate-600 bg-slate-800/50">
              <button
                onClick={() => setActiveTab('resumen')}
                className={`flex-1 px-4 py-4 text-sm font-medium transition-all ${
                  activeTab === 'resumen'
                    ? 'text-teal-400 border-b-2 border-teal-400 bg-slate-700/50'
                    : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Package size={16} />
                  Resumen
                </div>
              </button>
              <button
                onClick={() => setActiveTab('estadisticas')}
                className={`flex-1 px-4 py-4 text-sm font-medium transition-all ${
                  activeTab === 'estadisticas'
                    ? 'text-teal-400 border-b-2 border-teal-400 bg-slate-700/50'
                    : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <TrendingUp size={16} />
                  Estadísticas
                </div>
              </button>
              <button
                onClick={() => setActiveTab('notas')}
                className={`flex-1 px-4 py-4 text-sm font-medium transition-all ${
                  activeTab === 'notas'
                    ? 'text-teal-400 border-b-2 border-teal-400 bg-slate-700/50'
                    : 'text-slate-400 hover:text-slate-300'
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
                  <h3 className="text-lg font-semibold text-white mb-4">Información del producto</h3>
                  <div className="space-y-3">
                    <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600">
                      <p className="text-xs text-slate-400 mb-1">Nombre</p>
                      <p className="text-sm font-medium text-white">{product.name}</p>
                    </div>
                    <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600">
                      <p className="text-xs text-slate-400 mb-1">Precio</p>
                      <p className="text-sm font-medium text-green-400">${price.toFixed(2)}</p>
                    </div>
                    <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600">
                      <p className="text-xs text-slate-400 mb-1">Stock disponible</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm font-bold text-white">{stock} unidades</span>
                        <span className={`text-xs font-medium px-2 py-1 rounded ${stockBg} ${stockColor}`}>
                          {stockStatus}
                        </span>
                      </div>
                    </div>
                    {product.category && (
                      <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600">
                        <p className="text-xs text-slate-400 mb-1">Categoría</p>
                        <p className="text-sm text-white">{product.category}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'estadisticas' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white mb-4">Estadísticas de ventas</h3>
                  {stats ? (
                    <div className="space-y-3">
                      <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600">
                        <p className="text-xs text-slate-400 mb-1">Unidades vendidas</p>
                        <p className="text-2xl font-bold text-teal-400">{stats.totalSold ?? 0}</p>
                      </div>
                      <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600">
                        <p className="text-xs text-slate-400 mb-1">Ingresos totales</p>
                        <p className="text-2xl font-bold text-green-400">${(stats.totalRevenue ?? 0).toFixed(2)}</p>
                      </div>
                      {stats.lastSold && (
                        <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600">
                          <p className="text-xs text-slate-400 mb-1">Última venta</p>
                          <p className="text-sm text-white">{new Date(stats.lastSold).toLocaleDateString('es-ES')}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-slate-400 text-center py-8">No hay datos de estadísticas disponibles</p>
                  )}
                </div>
              )}

              {activeTab === 'notas' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white mb-4">Notas</h3>
                  <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600 border-dashed">
                    <p className="text-slate-400 text-center text-sm">No hay notas registradas. Agrega notas para recordar detalles importantes sobre este producto.</p>
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
