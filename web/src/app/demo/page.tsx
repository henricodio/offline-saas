'use client';

import { useToast } from '@/hooks/useToast';

export default function DemoPage() {
  const toast = useToast();

  return (
    <main className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Demo - Toast Notifications</h1>
      
      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">Tipos de Notificaciones</h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={() => toast.success('¡Operación completada exitosamente!')}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
          >
            Success Toast
          </button>
          
          <button
            onClick={() => toast.error('Ocurrió un error al procesar la solicitud')}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            Error Toast
          </button>
          
          <button
            onClick={() => toast.info('Esta es una notificación informativa')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Info Toast
          </button>
          
          <button
            onClick={() => toast.warning('Advertencia: verifica los datos antes de continuar')}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors"
          >
            Warning Toast
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">Duración Personalizada</h2>
        
        <div className="space-y-2 text-sm text-gray-600">
          <p>• Sin duración (permanente): 0</p>
          <p>• Rápido (1 segundo): 1000</p>
          <p>• Normal (3 segundos): 3000 (default)</p>
          <p>• Lento (5 segundos): 5000</p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={() => toast.success('Desaparece en 1 segundo', 1000)}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
          >
            1 segundo
          </button>
          
          <button
            onClick={() => toast.success('Desaparece en 5 segundos', 5000)}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
          >
            5 segundos
          </button>
          
          <button
            onClick={() => toast.info('Permanente (cierra manualmente)', 0)}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
          >
            Permanente
          </button>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">Cómo usar en tu código:</h3>
        <pre className="bg-white p-3 rounded border border-blue-100 text-xs overflow-x-auto">
{`'use client';

import { useToast } from '@/hooks/useToast';

export default function MyComponent() {
  const toast = useToast();

  const handleSave = async () => {
    try {
      // Tu lógica aquí
      toast.success('Guardado exitosamente');
    } catch (error) {
      toast.error('Error al guardar');
    }
  };

  return (
    <button onClick={handleSave}>
      Guardar
    </button>
  );
}`}
        </pre>
      </div>
    </main>
  );
}
