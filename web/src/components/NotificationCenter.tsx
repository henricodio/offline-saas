"use client";

import { useState } from "react";
import { Bell, X, AlertCircle, Info, AlertTriangle, CheckCircle } from "lucide-react";

interface Notification {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title: string;
  message?: string;
  timestamp: string;
  read: boolean;
}

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: "1",
      type: "success",
      title: "Meta de ventas alcanzada",
      message: "¡Felicidades! Has superado tu meta mensual en un 15%",
      timestamp: new Date(Date.now() - 2 * 3600000).toISOString(),
      read: false,
    },
    {
      id: "2",
      type: "warning",
      title: "Stock bajo",
      message: "El producto 'Laptop HP' tiene solo 3 unidades disponibles",
      timestamp: new Date(Date.now() - 5 * 3600000).toISOString(),
      read: false,
    },
    {
      id: "3",
      type: "info",
      title: "Nuevo feature disponible",
      message: "Ahora puedes exportar reportes en PDF",
      timestamp: new Date(Date.now() - 24 * 3600000).toISOString(),
      read: true,
    },
    {
      id: "4",
      type: "error",
      title: "Pago pendiente",
      message: "El cliente Juan Pérez tiene un pago vencido hace 5 días",
      timestamp: new Date(Date.now() - 48 * 3600000).toISOString(),
      read: true,
    },
  ]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const getIcon = (type: Notification["type"]) => {
    switch (type) {
      case "success":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "error":
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case "warning":
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case "info":
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (hours < 1) return "Hace menos de 1 hora";
    if (hours < 24) return `Hace ${hours} ${hours === 1 ? "hora" : "horas"}`;
    if (days < 7) return `Hace ${days} ${days === 1 ? "día" : "días"}`;
    
    return date.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
  };

  return (
    <div className="relative">
      {/* Bell Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Panel */}
          <div className="absolute right-0 mt-2 w-96 max-h-[600px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Notificaciones
                </h3>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-sm text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 font-medium"
                    >
                      Marcar todas como leídas
                    </button>
                  )}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-[400px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">
                    No tienes notificaciones
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {notifications.map(notification => (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer ${
                        !notification.read ? "bg-orange-50/50 dark:bg-orange-900/10" : ""
                      }`}
                      onClick={() => markAsRead(notification.id)}
                    >
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {getIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <h4 className={`font-medium text-gray-900 dark:text-white ${
                                !notification.read ? "" : "text-gray-700 dark:text-gray-300"
                              }`}>
                                {notification.title}
                              </h4>
                              {notification.message && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                                  {notification.message}
                                </p>
                              )}
                            </div>
                            {!notification.read && (
                              <div className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0 mt-2" />
                            )}
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            {formatTime(notification.timestamp)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-3 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={clearAll}
                  className="w-full text-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium transition-colors"
                >
                  Limpiar todas las notificaciones
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
