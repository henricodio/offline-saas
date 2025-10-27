'use client';

import Link from 'next/link';
import { Eye, Pencil, Trash2, Calendar, DollarSign } from 'lucide-react';

type OrderCardProps = {
  id: string;
  cliente_id?: string;
  cliente_nombre?: string;
  total: number | null;
  fecha: string | null;
  created_at: string | null;
  estado?: string | null;
};

export default function OrderCard({
  id,
  cliente_id,
  cliente_nombre,
  total,
  fecha,
  created_at,
  estado,
}: OrderCardProps) {
  const displayDate = fecha || (created_at ? created_at.slice(0, 10) : '-');
  const displayTotal = total != null ? Number(total).toFixed(2) : '0.00';
  const statusLabel = estado || 'pendiente';

  const statusColors: Record<string, { bg: string; text: string; badge: string }> = {
    pendiente: { bg: 'bg-yellow-50', text: 'text-yellow-800', badge: 'badge-warning' },
    en_proceso: { bg: 'bg-blue-50', text: 'text-blue-800', badge: 'badge-info' },
    completado: { bg: 'bg-green-50', text: 'text-green-800', badge: 'badge-success' },
    cancelado: { bg: 'bg-red-50', text: 'text-red-800', badge: 'badge-destructive' },
  };

  const colors = statusColors[statusLabel] || statusColors.pendiente;

  return (
    <div className={`border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow p-4 space-y-3 ${colors.bg}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <Link href={`/orders/${id}`} className="text-sm font-semibold text-gray-900 hover:text-blue-600 truncate block font-mono">
            #{id.slice(0, 8)}...
          </Link>
          {cliente_nombre && (
            <p className="text-xs text-gray-600 mt-1 truncate">
              {cliente_id ? (
                <Link href={`/clients/${cliente_id}`} className="hover:underline">
                  {cliente_nombre}
                </Link>
              ) : (
                cliente_nombre
              )}
            </p>
          )}
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <Link href={`/orders/${id}`} aria-label="Ver pedido" className="p-2 hover:bg-gray-200 rounded-md transition-colors">
            <Eye size={16} className="text-gray-600" />
          </Link>
          <Link href={`/orders/${id}/edit`} aria-label="Editar pedido" className="p-2 hover:bg-gray-200 rounded-md transition-colors">
            <Pencil size={16} className="text-gray-600" />
          </Link>
          <button aria-label="Eliminar pedido" className="p-2 hover:bg-gray-200 rounded-md transition-colors opacity-50 cursor-not-allowed" disabled>
            <Trash2 size={16} className="text-gray-600" />
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2 text-gray-700">
          <DollarSign size={14} className="text-gray-400 flex-shrink-0" />
          <span className="font-semibold">${displayTotal}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-700">
          <Calendar size={14} className="text-gray-400 flex-shrink-0" />
          <span>{displayDate}</span>
        </div>
      </div>

      {/* Status Badge */}
      <div className="pt-2 border-t border-gray-200">
        <span className={`badge ${colors.badge} text-xs`}>
          {statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1).replace('_', ' ')}
        </span>
      </div>
    </div>
  );
}
