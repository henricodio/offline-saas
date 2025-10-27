'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Trash2 } from 'lucide-react';

type OrderItem = {
  id: string;
  nombre_producto: string;
  precio_unitario: number;
  cantidad: number;
};

type OrderFormProps = {
  clientSuggest: { id: string; nombre: string | null }[];
  productSuggest: { id: string; name: string; price: number | null }[];
  onSubmit: (formData: FormData) => Promise<void>;
  isLoading?: boolean;
};

export default function OrderForm({ clientSuggest, productSuggest, onSubmit, isLoading = false }: OrderFormProps) {
  const [items, setItems] = useState<OrderItem[]>([]);
  const [newItem, setNewItem] = useState({ product: '', quantity: 1, price: 0 });

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

  return (
    <form action={onSubmit} className="space-y-6">
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
        <button type="submit" disabled={isLoading} className="btn btn-primary btn-md">
          {isLoading ? 'Guardando...' : 'Guardar pedido'}
        </button>
        <Link href="/orders" className="btn btn-ghost btn-md">Cancelar</Link>
      </div>
    </form>
  );
}
