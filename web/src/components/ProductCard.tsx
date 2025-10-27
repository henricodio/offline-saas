'use client';

import Link from 'next/link';
import { Eye, Pencil, Trash2, TrendingDown } from 'lucide-react';

type ProductCardProps = {
  id: string;
  name: string;
  price: number | null;
  stock: number | null;
  category: string | null;
  external_id?: string | null;
};

export default function ProductCard({
  id,
  name,
  price,
  stock,
  category,
  external_id,
}: ProductCardProps) {
  const displayPrice = price != null ? Number(price).toFixed(2) : '0.00';
  const displayStock = stock ?? 0;
  const isLowStock = displayStock > 0 && displayStock <= 20;
  const isOutOfStock = displayStock <= 0;

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <Link href={`/products/${id}`} className="text-sm font-semibold text-gray-900 hover:text-blue-600 truncate block">
            {name}
          </Link>
          {external_id && (
            <p className="text-xs text-gray-500 mt-1 font-mono">SKU: {external_id}</p>
          )}
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <Link href={`/products/${id}`} aria-label="Ver producto" className="p-2 hover:bg-gray-100 rounded-md transition-colors">
            <Eye size={16} className="text-gray-600" />
          </Link>
          <Link href={`/products/${id}/edit`} aria-label="Editar producto" className="p-2 hover:bg-gray-100 rounded-md transition-colors">
            <Pencil size={16} className="text-gray-600" />
          </Link>
          <button aria-label="Eliminar producto" className="p-2 hover:bg-gray-100 rounded-md transition-colors opacity-50 cursor-not-allowed" disabled>
            <Trash2 size={16} className="text-gray-600" />
          </button>
        </div>
      </div>

      {/* Precio */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">Precio</span>
        <span className="font-semibold text-gray-900">${displayPrice}</span>
      </div>

      {/* Stock */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Stock</span>
          <span className={`font-semibold ${isOutOfStock ? 'text-red-600' : isLowStock ? 'text-yellow-600' : 'text-green-600'}`}>
            {displayStock}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${
              isOutOfStock ? 'bg-red-500' : isLowStock ? 'bg-yellow-500' : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(100, (displayStock / 100) * 100)}%` }}
          />
        </div>
      </div>

      {/* Categoría y estado */}
      <div className="pt-2 border-t border-gray-200 flex items-center justify-between gap-2">
        {category && (
          <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded truncate">
            {category}
          </span>
        )}
        {isOutOfStock && (
          <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded inline-flex items-center gap-1">
            <TrendingDown size={12} />
            Agotado
          </span>
        )}
        {isLowStock && !isOutOfStock && (
          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded inline-flex items-center gap-1">
            <TrendingDown size={12} />
            Bajo stock
          </span>
        )}
      </div>
    </div>
  );
}
