import { Clock, Users, Package, ShoppingCart, TrendingUp, CheckCircle, AlertCircle } from "lucide-react";

interface Activity {
  id: string;
  type: "client" | "order" | "product" | "task" | "system";
  title: string;
  description?: string;
  timestamp: string;
  icon?: React.ReactNode;
  color?: string;
}

interface ActivityTimelineProps {
  activities?: Activity[];
  maxItems?: number;
}

const getActivityIcon = (type: Activity["type"]) => {
  switch (type) {
    case "client":
      return <Users className="w-4 h-4" />;
    case "order":
      return <ShoppingCart className="w-4 h-4" />;
    case "product":
      return <Package className="w-4 h-4" />;
    case "task":
      return <CheckCircle className="w-4 h-4" />;
    case "system":
      return <AlertCircle className="w-4 h-4" />;
    default:
      return <Clock className="w-4 h-4" />;
  }
};

const getActivityColor = (type: Activity["type"]) => {
  switch (type) {
    case "client":
      return "bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800";
    case "order":
      return "bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800";
    case "product":
      return "bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800";
    case "task":
      return "bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800";
    case "system":
      return "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700";
    default:
      return "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700";
  }
};

const formatTime = (timestamp: string) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Justo ahora";
  if (minutes < 60) return `Hace ${minutes} ${minutes === 1 ? "minuto" : "minutos"}`;
  if (hours < 24) return `Hace ${hours} ${hours === 1 ? "hora" : "horas"}`;
  if (days < 7) return `Hace ${days} ${days === 1 ? "día" : "días"}`;
  
  return date.toLocaleDateString("es-ES", { 
    day: "numeric", 
    month: "short",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined
  });
};

export default function ActivityTimeline({ activities, maxItems = 5 }: ActivityTimelineProps) {
  // Datos de ejemplo si no se proporcionan actividades
  const defaultActivities: Activity[] = [
    {
      id: "1",
      type: "order",
      title: "Nueva venta registrada",
      description: "Pedido #2024-156 por $1,250.00",
      timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
    },
    {
      id: "2",
      type: "client",
      title: "Nuevo cliente agregado",
      description: "María García - Zona Norte",
      timestamp: new Date(Date.now() - 45 * 60000).toISOString(),
    },
    {
      id: "3",
      type: "task",
      title: "Tarea completada",
      description: "Llamar a cliente VIP",
      timestamp: new Date(Date.now() - 2 * 3600000).toISOString(),
    },
    {
      id: "4",
      type: "product",
      title: "Stock actualizado",
      description: "Producto ABC - 50 unidades agregadas",
      timestamp: new Date(Date.now() - 5 * 3600000).toISOString(),
    },
    {
      id: "5",
      type: "system",
      title: "Reporte generado",
      description: "Reporte mensual de ventas",
      timestamp: new Date(Date.now() - 24 * 3600000).toISOString(),
    },
  ];

  const items = (activities || defaultActivities).slice(0, maxItems);

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-orange-500" />
          Actividad Reciente
        </h3>
        <button className="text-sm text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 font-medium transition-colors">
          Ver todo
        </button>
      </div>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />

        {/* Timeline items */}
        <div className="space-y-4">
          {items.map((activity) => (
            <div key={activity.id} className="relative flex gap-4">
              {/* Icon */}
              <div className={`relative z-10 flex-shrink-0 w-10 h-10 rounded-full border-2 flex items-center justify-center ${getActivityColor(activity.type)}`}>
                {activity.icon || getActivityIcon(activity.type)}
              </div>

              {/* Content */}
              <div className="flex-1 pb-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {activity.title}
                    </h4>
                    {activity.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                        {activity.description}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-500 whitespace-nowrap">
                    {formatTime(activity.timestamp)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* End indicator */}
        <div className="relative flex gap-4">
          <div className="relative z-10 flex-shrink-0 w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center">
            <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full" />
          </div>
          <div className="flex-1 pb-4">
            <p className="text-sm text-gray-500 dark:text-gray-500 italic">
              Fin de la actividad reciente
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
