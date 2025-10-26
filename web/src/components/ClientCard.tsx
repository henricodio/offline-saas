'use client';

import Link from 'next/link';
import { Eye, Pencil, Trash2, MapPin, Phone, Mail, Calendar } from 'lucide-react';

type ClientCardProps = {
  id: string;
  nombre: string;
  contacto: string | null;
  phone: string | null;
  direccion: string | null;
  city: string | null;
  route: string | null;
  created_at: string | null;
};

export default function ClientCard({ id, nombre, contacto, phone, direccion, city, route, created_at }: ClientCardProps) {
  const createdDate = created_at ? new Date(created_at).toLocaleDateString('es-ES') : '-';

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <Link href={`/clients/${id}`} className="text-lg font-semibold text-gray-900 hover:text-blue-600 truncate block">
            {nombre}
          </Link>
          {route && (
            <p className="text-xs text-gray-500 mt-1">Ruta: {route}</p>
          )}
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <Link href={`/clients/${id}`} aria-label="Ver cliente" className="p-2 hover:bg-gray-100 rounded-md transition-colors">
            <Eye size={16} className="text-gray-600" />
          </Link>
          <Link href={`/clients/${id}/edit`} aria-label="Editar cliente" className="p-2 hover:bg-gray-100 rounded-md transition-colors">
            <Pencil size={16} className="text-gray-600" />
          </Link>
          <button aria-label="Eliminar cliente" className="p-2 hover:bg-gray-100 rounded-md transition-colors opacity-50 cursor-not-allowed" disabled>
            <Trash2 size={16} className="text-gray-600" />
          </button>
        </div>
      </div>

      {/* Contact Info */}
      <div className="space-y-2 text-sm">
        {contacto && (
          <div className="flex items-center gap-2 text-gray-700">
            <Mail size={14} className="text-gray-400 flex-shrink-0" />
            <a href={`mailto:${contacto}`} className="hover:text-blue-600 truncate">
              {contacto}
            </a>
          </div>
        )}
        {phone && (
          <div className="flex items-center gap-2 text-gray-700">
            <Phone size={14} className="text-gray-400 flex-shrink-0" />
            <a href={`tel:${phone}`} className="hover:text-blue-600">
              {phone}
            </a>
          </div>
        )}
        {(direccion || city) && (
          <div className="flex items-start gap-2 text-gray-700">
            <MapPin size={14} className="text-gray-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              {direccion && <p className="truncate">{direccion}</p>}
              {city && <p className="text-xs text-gray-500">{city}</p>}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="pt-2 border-t border-gray-100 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <Calendar size={12} />
          Agregado: {createdDate}
        </div>
      </div>
    </div>
  );
}
