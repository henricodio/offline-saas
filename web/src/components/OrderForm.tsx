'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { supabase } from '@/lib/supabase/client';

type OrderItem = {
  id: string;
  nombre_producto: string;
  precio_unitario: number;
  cantidad: number;
};

type OrderFormProps = {
  clientSuggest: { id: string; nombre: string | null }[];
  productSuggest: { id: string; name: string; price: number | null }[];
  onSubmit?: (formData: FormData) => Promise<void>;
  isLoading?: boolean;
};

function looksLikeUUID(s: string) {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(s);
}

export default function OrderForm({ clientSuggest, productSuggest, isLoading: initialLoading = false }: OrderFormProps) {
  const router = useRouter();
  const toast = useToast();
  const [items, setItems] = useState<OrderItem[]>([]);
  const [newItem, setNewItem] = useState({ product: '', quantity: 1, price: 0 });
  const [isLoading, setIsLoading] = useState(initialLoading);

  const today = new Date().toISOString().split('T')[0];
  const total = items.reduce((sum, item) => sum + item.precio_unitario * item.cantidad, 0);

  const addItem = () => {
    if (!newItem.product || newItem.quantity <= 0 || newItem.price < 0) return;
    
    const item: OrderItem = {
      id: Math.random().toString(36).substr(2, 9),
      nombre_producto: newItem.product,
      precio_unitario: newItem.price,
      cantidad: newItem.quantity,
    };
    
    setItems([...items, item]);
    setNewItem({ product: '', quantity: 1, price: 0 });
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const handleProductSelect = (productName: string) => {
    const product = productSuggest.find(p => p.name === productName);
    if (product) {
      setNewItem({
        product: productName,
        quantity: 1,
        price: product.price ?? 0,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      const clientInput = ((formData.get("client") as string) || "").trim();
      const fecha = ((formData.get("fecha") as string) || "").trim() || null;
      const estado = ((formData.get("estado") as string) || "").trim() || "pendiente";
      const rawTotal = ((formData.get("total") as string) || "").trim();
      const total = rawTotal !== "" && !Number.isNaN(Number(rawTotal)) ? Number(rawTotal) : null;

      if (!clientInput) {
        toast.error('Cliente es requerido');
        setIsLoading(false);
        return;
      }

      let cliente_id: string | null = null;
      if (looksLikeUUID(clientInput)) {
        cliente_id = clientInput;
      } else {
        const { data: found } = await supabase
          .from("clients")
          .select("id, nombre")
          .eq("nombre", clientInput)
          .limit(1)
          .maybeSingle();
        cliente_id = found?.id ?? null;
      }

      if (!cliente_id) {
        toast.error('No se encontró el cliente');
        setIsLoading(false);
        return;
      }

      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .insert({ cliente_id, fecha, total, estado })
        .select("id")
        .single();

      if (orderError) {
        toast.error(`Error al crear pedido: ${orderError.message}`);
        setIsLoading(false);
        return;
      }

      // Insertar items si existen
      if (items.length > 0 && orderData?.id) {
        const itemsToInsert = items.map((item) => ({
          order_id: orderData.id,
          nombre_producto: item.nombre_producto,
          precio_unitario: item.precio_unitario,
          cantidad: item.cantidad,
          total_linea: item.precio_unitario * item.cantidad,
        }));
        const { error: itemsError } = await supabase.from("order_items").insert(itemsToInsert);
        if (itemsError) {
          toast.warning('Pedido creado pero hubo error al agregar items');
        }
      }

      toast.success('Pedido creado exitosamente');
      setTimeout(() => {
        router.push("/orders");
      }, 500);
    } catch (error) {
      toast.error('Error inesperado al crear el pedido');
      console.error(error);
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Cliente */}
      <div>
        <label className="block text-sm font-medium mb-1">Cliente *</label>
        <input
          list="clientOptions"
          name="client"
          required
          placeholder="Nombre exacto o UUID"
          className="input w-full"
        />
        <datalist id="clientOptions">
          {clientSuggest.map(c => (
            <option key={c.id} value={c.nombre || ''} />
          ))}
        </datalist>
      </div>

      {/* Fecha y Estado */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Fecha</label>
          <input name="fecha" type="date" defaultValue={today} className="input w-full" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Estado</label>
          <select name="estado" defaultValue="pendiente" className="input w-full">
            <option value="pendiente">Pendiente</option>
            <option value="en_proceso">En proceso</option>
            <option value="completado">Completado</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>
      </div>

      {/* Items */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Items del pedido</h3>
        
        {/* Agregar item */}
        <div className="card p-4 bg-gray-50 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Producto</label>
              <input
                list="productOptions"
                value={newItem.product}
                onChange={(e) => handleProductSelect(e.target.value)}
                placeholder="Seleccionar"
                className="input w-full text-sm"
              />
              <datalist id="productOptions">
                {productSuggest.map(p => (
                  <option key={p.id} value={p.name} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Cantidad</label>
              <input
                type="number"
                min="1"
                value={newItem.quantity}
                onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 1 })}
                className="input w-full text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Precio unit.</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={newItem.price}
                onChange={(e) => setNewItem({ ...newItem, price: parseFloat(e.target.value) || 0 })}
                className="input w-full text-sm"
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={addItem}
                className="btn btn-primary btn-sm w-full inline-flex items-center justify-center gap-1"
              >
                <Plus size={16} />
                Agregar
              </button>
            </div>
          </div>
        </div>

        {/* Lista de items */}
        {items.length > 0 ? (
          <div className="card p-0 divide-y">
            {items.map((item) => (
              <div key={item.id} className="p-3 flex items-center justify-between gap-3 hover:bg-gray-50">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{item.nombre_producto}</p>
                  <p className="text-xs text-gray-500">
                    {item.cantidad} × ${item.precio_unitario.toFixed(2)} = ${(item.cantidad * item.precio_unitario).toFixed(2)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="p-2 hover:bg-red-100 rounded-md transition-colors"
                >
                  <Trash2 size={16} className="text-red-600" />
                </button>
              </div>
            ))}
            <div className="p-3 bg-gray-50 flex items-center justify-between font-semibold">
              <span>Total:</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center py-4">Sin items agregados</p>
        )}
      </div>

      {/* Total oculto */}
      <input type="hidden" name="total" value={total.toFixed(2)} />
      <input type="hidden" name="items" value={JSON.stringify(items)} />

      {/* Botones */}
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={isLoading}
          className="btn btn-primary btn-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Guardando...' : 'Guardar pedido'}
        </button>
        <Link href="/orders" className="btn btn-ghost btn-md">Cancelar</Link>
      </div>
    </form>
  );
}
