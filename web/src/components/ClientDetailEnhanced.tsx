'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  Mail, Phone, MapPin, Edit, ArrowLeft, ShoppingBag, 
  DollarSign, TrendingUp, Package, Clock, Star, AlertCircle, 
  ChevronUp, ChevronDown, Activity, Target, Award
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

interface ClientDetailEnhancedProps {
  client: {
    id: string;
    nombre: string;
    contacto: string | null;
    direccion: string | null;
    phone: string | null;
    route: string | null;
    city: string | null;
    created_at: string | null;
  };
  stats: {
    totalOrders: number;
    totalSpent: number;
    averageOrderValue: number;
    lastOrderDate: string | null;
    firstOrderDate: string | null;
    daysSinceLastOrder: number | null;
    monthlyTrend: number;
    status: 'vip' | 'active' | 'inactive' | 'new';
    loyaltyScore: number;
  };
  monthlyData: Array<{
    month: string;
    orders: number;
    revenue: number;
  }>;
  productStats: Array<{
    name: string;
    quantity: number;
    revenue: number;
    percentage: number;
  }>;
  recentOrders: Array<{
    id: string;
    fecha: string;
    total: number;
    estado: string;
    items: number;
  }>;
}

export default function ClientDetailEnhanced({ 
  client, 
  stats, 
  monthlyData = [],
  productStats = [],
  recentOrders = []
}: ClientDetailEnhancedProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'trends' | 'products' | 'history'>('overview');

  const getStatusBadge = () => {
    switch (stats.status) {
      case 'vip':
        return <span className="px-3 py-1 text-sm font-medium bg-gradient-to-r from-yellow-100 to-orange-100 text-orange-800 dark:from-yellow-900/30 dark:to-orange-900/30 dark:text-orange-400 rounded-full flex items-center gap-1">
          <Star size={14} /> Cliente VIP
        </span>;
      case 'new':
        return <span className="px-3 py-1 text-sm font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 rounded-full">Cliente Nuevo</span>;
      case 'inactive':
        return <span className="px-3 py-1 text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full flex items-center gap-1">
          <AlertCircle size={14} /> Inactivo
        </span>;
      default:
        return <span className="px-3 py-1 text-sm font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 rounded-full">Activo</span>;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
              {client.nombre.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                {client.nombre}
                {getStatusBadge()}
              </h1>
              <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
                {client.phone && (
                  <a href={`tel:${client.phone}`} className="flex items-center gap-1 hover:text-orange-600 dark:hover:text-orange-400">
                    <Phone size={14} /> {client.phone}
                  </a>
                )}
                {client.contacto && (
                  <a href={`mailto:${client.contacto}`} className="flex items-center gap-1 hover:text-orange-600 dark:hover:text-orange-400">
                    <Mail size={14} /> {client.contacto}
                  </a>
                )}
                {client.city && (
                  <span className="flex items-center gap-1">
                    <MapPin size={14} /> {client.city}
                  </span>
                )}
                {client.route && (
                  <span className="flex items-center gap-1">
                    <Target size={14} /> Ruta: {client.route}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href={`/clients/${client.id}/edit`} className="btn btn-ghost btn-sm">
              <Edit size={16} /> Editar
            </Link>
            <Link href="/clients" className="btn btn-ghost btn-sm">
              <ArrowLeft size={16} /> Volver
            </Link>
          </div>
        </div>

        {/* Loyalty Score Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Score de Lealtad</span>
            <span className="font-medium text-gray-900 dark:text-white">{stats.loyaltyScore}%</span>
          </div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${
                stats.loyaltyScore >= 80 ? 'bg-gradient-to-r from-green-400 to-green-600' :
                stats.loyaltyScore >= 50 ? 'bg-gradient-to-r from-yellow-400 to-orange-500' :
                'bg-gradient-to-r from-gray-400 to-gray-500'
              }`}
              style={{ width: `${stats.loyaltyScore}%` }}
            />
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Total Pedidos</span>
            <ShoppingBag className="w-5 h-5 text-orange-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalOrders}</div>
          {stats.monthlyTrend !== 0 && (
            <div className={`flex items-center gap-1 text-sm mt-1 ${stats.monthlyTrend > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {stats.monthlyTrend > 0 ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {Math.abs(stats.monthlyTrend)}% vs mes anterior
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Total Gastado</span>
            <DollarSign className="w-5 h-5 text-green-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(stats.totalSpent)}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            ~{formatCurrency(stats.averageOrderValue)}/pedido
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Última Compra</span>
            <Clock className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {stats.daysSinceLastOrder !== null ? (
              stats.daysSinceLastOrder === 0 ? 'Hoy' :
              stats.daysSinceLastOrder === 1 ? 'Ayer' :
              `Hace ${stats.daysSinceLastOrder} días`
            ) : 'Nunca'}
          </div>
          {stats.lastOrderDate && (
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {formatDate(stats.lastOrderDate)}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Cliente Desde</span>
            <Award className="w-5 h-5 text-purple-500" />
          </div>
          <div className="text-lg font-bold text-gray-900 dark:text-white">
            {client.created_at ? formatDate(client.created_at) : 'N/A'}
          </div>
          {stats.firstOrderDate && (
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              1ra compra: {formatDate(stats.firstOrderDate)}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex gap-1 p-1">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'overview' 
                  ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' 
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Activity className="w-4 h-4 inline mr-2" />
              Resumen
            </button>
            <button
              onClick={() => setActiveTab('trends')}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'trends' 
                  ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' 
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <TrendingUp className="w-4 h-4 inline mr-2" />
              Tendencias
            </button>
            <button
              onClick={() => setActiveTab('products')}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'products' 
                  ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' 
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Package className="w-4 h-4 inline mr-2" />
              Productos
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'history' 
                  ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' 
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Clock className="w-4 h-4 inline mr-2" />
              Historial
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Quick Stats */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Información General</h3>
                <div className="space-y-3">
                  <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-gray-600 dark:text-gray-400">Dirección</span>
                    <span className="text-gray-900 dark:text-white">{client.direccion || 'No especificada'}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-gray-600 dark:text-gray-400">Frecuencia de compra</span>
                    <span className="text-gray-900 dark:text-white">
                      {stats.totalOrders > 0 ? `Cada ${Math.round(30 / (stats.totalOrders / 12))} días` : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-gray-600 dark:text-gray-400">Ticket promedio</span>
                    <span className="text-gray-900 dark:text-white">{formatCurrency(stats.averageOrderValue)}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-gray-600 dark:text-gray-400">Valor del cliente (LTV)</span>
                    <span className="text-lg font-bold text-orange-600 dark:text-orange-400">{formatCurrency(stats.totalSpent)}</span>
                  </div>
                </div>
              </div>

              {/* Mini Chart */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Últimos 6 Meses</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={monthlyData.slice(-6)}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Area type="monotone" dataKey="revenue" stroke="#f97316" fillOpacity={1} fill="url(#colorRevenue)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Trends Tab */}
          {activeTab === 'trends' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Tendencia de Compras</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Line yAxisId="left" type="monotone" dataKey="orders" stroke="#3b82f6" name="Pedidos" strokeWidth={2} />
                    <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#10b981" name="Ingresos" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Mejor Mes</div>
                  <div className="text-lg font-bold text-gray-900 dark:text-white">
                    {monthlyData.length > 0 ? monthlyData.reduce((max, item) => item.revenue > max.revenue ? item : max).month : 'N/A'}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {monthlyData.length > 0 ? formatCurrency(Math.max(...monthlyData.map(m => m.revenue))) : 'N/A'}
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Promedio Mensual</div>
                  <div className="text-lg font-bold text-gray-900 dark:text-white">
                    {formatCurrency(monthlyData.reduce((sum, item) => sum + item.revenue, 0) / (monthlyData.length || 1))}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    ~{Math.round(monthlyData.reduce((sum, item) => sum + item.orders, 0) / (monthlyData.length || 1))} pedidos/mes
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Tendencia</div>
                  <div className={`text-lg font-bold ${stats.monthlyTrend > 0 ? 'text-green-600' : stats.monthlyTrend < 0 ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>
                    {stats.monthlyTrend > 0 ? '↑' : stats.monthlyTrend < 0 ? '↓' : '→'} {Math.abs(stats.monthlyTrend)}%
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">vs mes anterior</div>
                </div>
              </div>
            </div>
          )}

          {/* Products Tab */}
          {activeTab === 'products' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Productos Más Comprados</h3>
              
              {productStats.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={productStats.slice(0, 10)}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="quantity" fill="#f97316" name="Cantidad" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    
                    <div className="space-y-3">
                      {productStats.slice(0, 5).map((product, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                              index === 0 ? 'bg-orange-500' : 
                              index === 1 ? 'bg-orange-400' : 
                              'bg-gray-400'
                            }`}>
                              {index + 1}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900 dark:text-white">{product.name}</div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">{product.quantity} unidades</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium text-gray-900 dark:text-white">{formatCurrency(product.revenue)}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">{product.percentage}%</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No hay datos de productos disponibles
                </div>
              )}
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Historial de Pedidos</h3>
              
              {recentOrders.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Fecha</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">ID Pedido</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Items</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Total</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Estado</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentOrders.map((order) => (
                        <tr key={order.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900">
                          <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">{formatDate(order.fecha)}</td>
                          <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">#{order.id.slice(-6)}</td>
                          <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">{order.items}</td>
                          <td className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(order.total)}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              order.estado === 'completado' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                              order.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                              'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                            }`}>
                              {order.estado}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <Link href={`/orders/${order.id}`} className="text-sm text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300">
                              Ver detalle →
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No hay pedidos registrados
                </div>
              )}
              
              <div className="flex justify-center">
                <Link href={`/orders?client=${client.id}`} className="btn btn-ghost btn-sm">
                  Ver todos los pedidos →
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3">
        <Link href={`/orders/new?client=${client.id}`} className="btn btn-primary">
          <ShoppingBag size={16} /> Nueva Venta
        </Link>
        <button className="btn btn-ghost">
          <Mail size={16} /> Enviar Email
        </button>
        <button className="btn btn-ghost">
          <Phone size={16} /> Llamar
        </button>
      </div>
    </div>
  );
}
