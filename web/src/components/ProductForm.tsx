'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/hooks/useToast';
import { supabase } from '@/lib/supabase/client';

interface ProductFormProps {
  initialData?: {
    id: string;
    name: string;
    external_id: string | null;
    category: string | null;
    price: number | null;
    stock: number | null;
  };
  isEditing?: boolean;
}

export default function ProductForm({ initialData, isEditing = false }: ProductFormProps) {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    external_id: initialData?.external_id || '',
    category: initialData?.category || '',
    price: initialData?.price?.toString() || '',
    stock: initialData?.stock?.toString() || '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!formData.name.trim()) {
        toast.error('El nombre es requerido');
        setLoading(false);
        return;
      }

      const price = formData.price !== '' && !Number.isNaN(Number(formData.price)) ? Number(formData.price) : null;
      const stock = formData.stock !== '' && Number.isFinite(Number(formData.stock)) ? Number(formData.stock) : null;

      const sb = supabase;
      let result;

      if (isEditing && initialData) {
        // Editar producto existente
        const { error } = await sb
          .from('products')
          .update({
            name: formData.name.trim(),
            external_id: formData.external_id.trim() || null,
            category: formData.category.trim() || null,
            price,
            stock,
          })
          .eq('id', initialData.id);

        if (error) {
          toast.error(`Error al actualizar: ${error.message}`);
          setLoading(false);
          return;
        }

        toast.success('Producto actualizado exitosamente');
        result = initialData.id;
      } else {
        // Crear nuevo producto
        const { data, error } = await sb
          .from('products')
          .insert({
            name: formData.name.trim(),
            external_id: formData.external_id.trim() || null,
            category: formData.category.trim() || null,
            price,
            stock,
          })
          .select('id')
          .single();

        if (error) {
          toast.error(`Error al crear: ${error.message}`);
          setLoading(false);
          return;
        }

        toast.success('Producto creado exitosamente');
        result = data?.id;
      }

      // Redirigir después de 500ms para que se vea el toast
      setTimeout(() => {
        router.push(`/products/${result}`);
      }, 500);
    } catch (error) {
      toast.error('Error inesperado al guardar el producto');
      console.error(error);
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm mb-1 font-medium text-gray-900">Nombre *</label>
        <input
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
          placeholder="Ej. Botella de agua"
          className="input w-full"
          disabled={loading}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm mb-1 font-medium text-gray-900">SKU</label>
          <input
            name="external_id"
            value={formData.external_id}
            onChange={handleChange}
            placeholder="Ej. SKU-001"
            className="input w-full"
            disabled={loading}
          />
        </div>
        <div>
          <label className="block text-sm mb-1 font-medium text-gray-900">Categoría</label>
          <input
            name="category"
            value={formData.category}
            onChange={handleChange}
            placeholder="Ej. Bebidas"
            className="input w-full"
            disabled={loading}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm mb-1 font-medium text-gray-900">Precio</label>
          <input
            name="price"
            type="number"
            step="0.01"
            min="0"
            value={formData.price}
            onChange={handleChange}
            placeholder="0.00"
            className="input w-full"
            disabled={loading}
          />
        </div>
        <div>
          <label className="block text-sm mb-1 font-medium text-gray-900">Stock</label>
          <input
            name="stock"
            type="number"
            min="0"
            value={formData.stock}
            onChange={handleChange}
            placeholder="0"
            className="input w-full"
            disabled={loading}
          />
        </div>
      </div>

      <div className="flex items-center gap-2 pt-4">
        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary btn-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Guardando...' : isEditing ? 'Actualizar' : 'Guardar'}
        </button>
        <Link href="/products" className="btn btn-ghost btn-md">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
