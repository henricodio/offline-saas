'use client';

import Link from 'next/link';
import { Eye, Pencil, Trash2, MapPin, Phone, Mail, Calendar, TrendingUp, ShoppingBag, DollarSign, Package, Star, Clock, AlertCircle, ChevronUp, ChevronDown } from 'lucide-react';

type ClientCardEnhancedProps = {
  id: string;
  nombre: string;
  contacto: string | null;
  phone: string | null;
  direccion: string | null;
  city: string | null;
  route: string | null;
  created_at: string | null;
  // Nuevas estadísticas
  totalOrders?: number;
  totalSpent?: number;
  lastOrderDate?: string | null;
  averageOrderValue?: number;
  favoriteProducts?: { name: string; count: number }[];
  monthlyTrend?: number; // Porcentaje de cambio vs mes anterior
  status?: 'active' | 'inactive' | 'vip' | 'new';
  paymentStatus?: 'on-time' | 'delayed' | 'overdue';
  loyaltyScore?: number; // 0-100
};

export default function ClientCardEnhanced({ 
  id, 
  nombre, 
  contacto, 
  phone, 
  direccion, 
  city, 
  route, 
  created_at,
  totalOrders = 0,
  totalSpent = 0,
  lastOrderDate,
  averageOrderValue = 0,
  favoriteProducts = [],
  monthlyTrend = 0,
  status = 'active',
  paymentStatus = 'on-time',
  loyaltyScore = 0
}: ClientCardEnhancedProps) {
  const createdDate = created_at ? new Date(created_at).toLocaleDateString('es-ES') : '-';
  const lastOrder = lastOrderDate ? new Date(lastOrderDate).toLocaleDateString('es-ES') : 'Nunca';
  const daysSinceLastOrder = lastOrderDate ? Math.floor((Date.now() - new Date(lastOrderDate).getTime()) / (1000 * 60 * 60 * 24)) : null;

  const getStatusBadge = () => {
    switch (status) {
      case 'vip':
        return <span className="px-2 py-0.5 text-xs font-medium bg-gradient-to-r from-yellow-100 to-orange-100 text-orange-800 rounded-full flex items-center gap-1">
          <Star size={10} /> VIP
        </span>;
      case 'new':
        return <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">Nuevo</span>;
      case 'inactive':
        return <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">Inactivo</span>;
      default:
        return <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded-full">Activo</span>;
    }
  };

  const getPaymentStatusIcon = () => {
    switch (paymentStatus) {
      case 'overdue':
        return <AlertCircle size={14} className="text-red-500" />;
      case 'delayed':
        return <Clock size={14} className="text-yellow-500" />;
      default:
        return null;
    }
  };

  const getLoyaltyColor = () => {
    if (loyaltyScore >= 80) return 'bg-green-500';
    if (loyaltyScore >= 50) return 'bg-yellow-500';
    if (loyaltyScore >= 20) return 'bg-orange-500';
    return 'bg-gray-300';
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden group">
      {/* Loyalty Bar */}
      <div className="h-1 bg-gray-200 dark:bg-gray-700">
        <div 
          className={`h-full ${getLoyaltyColor()} transition-all duration-500`}
          style={{ width: `${loyaltyScore}%` }}
        />
      </div>

      <div className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Link href={`/clients/${id}`} className="text-lg font-semibold text-gray-900 dark:text-white hover:text-orange-600 dark:hover:text-orange-400 truncate block">
                {nombre}
              </Link>
              {getStatusBadge()}
              {getPaymentStatusIcon()}
            </div>
            {route && (
              <p className="text-xs text-gray-500 dark:text-gray-400">Ruta: {route}</p>
            )}
          </div>
          <div className="flex gap-1 flex-shrink-0">
            <Link href={`/clients/${id}`} aria-label="Ver cliente" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors">
              <Eye size={16} className="text-gray-600 dark:text-gray-400" />
            </Link>
            <Link href={`/clients/${id}/edit`} aria-label="Editar cliente" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors">
              <Pencil size={16} className="text-gray-600 dark:text-gray-400" />
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3 py-3 border-y border-gray-100 dark:border-gray-700">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-1">
              <ShoppingBag size={12} />
              Pedidos
            </div>
            <div className="text-lg font-bold text-gray-900 dark:text-white">{totalOrders}</div>
            {monthlyTrend !== 0 && (
              <div className={`flex items-center justify-center gap-0.5 text-xs ${monthlyTrend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {monthlyTrend > 0 ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                {Math.abs(monthlyTrend)}%
              </div>
            )}
          </div>
          
          <div className="text-center border-x border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-1">
              <DollarSign size={12} />
              Total
            </div>
            <div className="text-lg font-bold text-gray-900 dark:text-white">
              ${totalSpent.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              ~${averageOrderValue.toFixed(0)}/orden
            </div>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-1">
              <Clock size={12} />
              Última
            </div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              {daysSinceLastOrder !== null ? (
                daysSinceLastOrder === 0 ? 'Hoy' :
                daysSinceLastOrder === 1 ? 'Ayer' :
                daysSinceLastOrder < 7 ? `${daysSinceLastOrder} días` :
                daysSinceLastOrder < 30 ? `${Math.floor(daysSinceLastOrder / 7)} sem` :
                `${Math.floor(daysSinceLastOrder / 30)} mes`
              ) : 'Nunca'}
            </div>
            {daysSinceLastOrder !== null && daysSinceLastOrder > 30 && (
              <div className="text-xs text-orange-600 dark:text-orange-400">⚠️ Inactivo</div>
            )}
          </div>
        </div>

        {/* Favorite Products */}
        {favoriteProducts.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <Package size={12} />
              Productos favoritos
            </div>
            <div className="flex flex-wrap gap-1">
              {favoriteProducts.slice(0, 3).map((product, index) => (
                <span key={index} className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full">
                  {product.name} ({product.count})
                </span>
              ))}
              {favoriteProducts.length > 3 && (
                <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-full">
                  +{favoriteProducts.length - 3} más
                </span>
              )}
            </div>
          </div>
        )}

        {/* Contact Info (Compact) */}
        <div className="flex flex-wrap gap-3 text-xs text-gray-600 dark:text-gray-400">
          {phone && (
            <a href={`tel:${phone}`} className="flex items-center gap-1 hover:text-orange-600 dark:hover:text-orange-400">
              <Phone size={10} />
              {phone}
            </a>
          )}
          {contacto && (
            <a href={`mailto:${contacto}`} className="flex items-center gap-1 hover:text-orange-600 dark:hover:text-orange-400 truncate max-w-[150px]">
              <Mail size={10} />
              {contacto}
            </a>
          )}
          {city && (
            <div className="flex items-center gap-1">
              <MapPin size={10} />
              {city}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
          <Link 
            href={`/orders/new?client=${id}`}
            className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors text-center"
          >
            Nueva Venta
          </Link>
          <Link 
            href={`/clients/${id}#history`}
            className="flex-1 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors text-center"
          >
            Ver Historial
          </Link>
        </div>
      </div>

      {/* Hover Effect Gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
    </div>
  );
}
