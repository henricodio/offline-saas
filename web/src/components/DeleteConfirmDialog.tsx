'use client';

import { useState } from 'react';
import { useToast } from '@/hooks/useToast';
import { supabase } from '@/lib/supabase/client';
import { AlertTriangle, X } from 'lucide-react';

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  itemName: string;
  tableName: string;
  itemId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function DeleteConfirmDialog({
  isOpen,
  title,
  description,
  itemName,
  tableName,
  itemId,
  onClose,
  onSuccess,
}: DeleteConfirmDialogProps) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);

    try {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', itemId);

      if (error) {
        toast.error(`Error al eliminar: ${error.message}`);
        setLoading(false);
        return;
      }

      toast.success(`${itemName} eliminado exitosamente`);
      onClose();
      
      // Llamar callback de éxito si existe
      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
        }, 500);
      }
    } catch (error) {
      toast.error('Error inesperado al eliminar');
      console.error(error);
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative bg-white rounded-lg shadow-lg max-w-sm w-full mx-4 p-6 space-y-4">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 hover:bg-gray-100 rounded-md transition-colors"
          aria-label="Cerrar"
        >
          <X size={20} className="text-gray-500" />
        </button>

        {/* Icon */}
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
            <AlertTriangle size={24} className="text-red-600" />
          </div>
        </div>

        {/* Content */}
        <div className="text-center space-y-2">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-600">{description}</p>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-4">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-gray-900 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleDelete}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Eliminando...' : 'Eliminar'}
          </button>
        </div>
      </div>
    </div>
  );
}
