'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/hooks/useToast';
import { supabase } from '@/lib/supabase/client';

interface ClientFormProps {
  initialData?: {
    id: string;
    nombre: string;
    contacto: string | null;
    phone: string | null;
    direccion: string | null;
    city: string | null;
    route: string | null;
  };
  isEditing?: boolean;
}

export default function ClientForm({ initialData, isEditing = false }: ClientFormProps) {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nombre: initialData?.nombre || '',
    contacto: initialData?.contacto || '',
    phone: initialData?.phone || '',
    direccion: initialData?.direccion || '',
    city: initialData?.city || '',
    route: initialData?.route || '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!formData.nombre.trim()) {
        toast.error('El nombre es requerido');
        setLoading(false);
        return;
      }

      const sb = supabase;
      let result;

      if (isEditing && initialData) {
        // Editar cliente existente
        const { error } = await sb
          .from('clients')
          .update({
            nombre: formData.nombre.trim(),
            contacto: formData.contacto.trim() || null,
            phone: formData.phone.trim() || null,
            direccion: formData.direccion.trim() || null,
            city: formData.city.trim() || null,
            route: formData.route.trim() || null,
          })
          .eq('id', initialData.id);

        if (error) {
          toast.error(`Error al actualizar: ${error.message}`);
          setLoading(false);
          return;
        }

        toast.success('Cliente actualizado exitosamente');
        result = initialData.id;
      } else {
        // Crear nuevo cliente
        const { data, error } = await sb
          .from('clients')
          .insert({
            nombre: formData.nombre.trim(),
            contacto: formData.contacto.trim() || null,
            phone: formData.phone.trim() || null,
            direccion: formData.direccion.trim() || null,
            city: formData.city.trim() || null,
            route: formData.route.trim() || null,
          })
          .select('id')
          .single();

        if (error) {
          toast.error(`Error al crear: ${error.message}`);
          setLoading(false);
          return;
        }

        toast.success('Cliente creado exitosamente');
        result = data?.id;
      }

      // Redirigir después de 500ms para que se vea el toast
      setTimeout(() => {
        router.push(`/clients/${result}`);
      }, 500);
    } catch (error) {
      toast.error('Error inesperado al guardar el cliente');
      console.error(error);
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm mb-1 font-medium text-gray-900">Nombre *</label>
        <input
          name="nombre"
          value={formData.nombre}
          onChange={handleChange}
          required
          placeholder="Ej. Juan Pérez"
          className="input w-full"
          disabled={loading}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm mb-1 font-medium text-gray-900">Contacto</label>
          <input
            name="contacto"
            value={formData.contacto}
            onChange={handleChange}
            placeholder="Ej. juan@correo.com"
            className="input w-full"
            disabled={loading}
          />
        </div>
        <div>
          <label className="block text-sm mb-1 font-medium text-gray-900">Teléfono</label>
          <input
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="Ej. +5491122334455"
            className="input w-full"
            disabled={loading}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm mb-1 font-medium text-gray-900">Dirección</label>
        <input
          name="direccion"
          value={formData.direccion}
          onChange={handleChange}
          placeholder="Calle 123, Barrio"
          className="input w-full"
          disabled={loading}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm mb-1 font-medium text-gray-900">Ciudad</label>
          <input
            name="city"
            value={formData.city}
            onChange={handleChange}
            placeholder="Ej. Buenos Aires"
            className="input w-full"
            disabled={loading}
          />
        </div>
        <div>
          <label className="block text-sm mb-1 font-medium text-gray-900">Ruta</label>
          <input
            name="route"
            value={formData.route}
            onChange={handleChange}
            placeholder="Ej. Zona Norte"
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
        <Link href="/clients" className="btn btn-ghost btn-md">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
