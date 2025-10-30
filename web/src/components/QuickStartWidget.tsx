"use client";

import { useState, useEffect } from "react";
import { Users, Package, ShoppingCart, CheckCircle2, X, ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";

interface QuickStartStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  completed: boolean;
}

export default function QuickStartWidget() {
  const [isVisible, setIsVisible] = useState(true);
  const [steps, setSteps] = useState<QuickStartStep[]>([
    {
      id: "add-client",
      title: "Agrega tu primer cliente",
      description: "Registra información de contacto",
      icon: <Users className="w-5 h-5" />,
      href: "/clients/new",
      completed: false,
    },
    {
      id: "add-product",
      title: "Crea un producto",
      description: "Define tu catálogo de productos",
      icon: <Package className="w-5 h-5" />,
      href: "/products/new",
      completed: false,
    },
    {
      id: "create-order",
      title: "Registra tu primera venta",
      description: "Crea un pedido de prueba",
      icon: <ShoppingCart className="w-5 h-5" />,
      href: "/orders/new",
      completed: false,
    },
    {
      id: "connect-bot",
      title: "Conecta el bot de Telegram",
      description: "Gestiona ventas desde el campo",
      icon: <Sparkles className="w-5 h-5" />,
      href: "#",
      completed: false,
    },
  ]);

  useEffect(() => {
    // Cargar estado desde localStorage
    const savedState = localStorage.getItem("quickstart-completed");
    const savedVisibility = localStorage.getItem("quickstart-visible");
    
    if (savedState) {
      const completedSteps = JSON.parse(savedState);
      setSteps(prev => prev.map(step => ({
        ...step,
        completed: completedSteps.includes(step.id)
      })));
    }
    
    if (savedVisibility === "false") {
      setIsVisible(false);
    }
  }, []);

  const markAsComplete = (stepId: string) => {
    const updatedSteps = steps.map(step => 
      step.id === stepId ? { ...step, completed: true } : step
    );
    setSteps(updatedSteps);
    
    const completedIds = updatedSteps
      .filter(s => s.completed)
      .map(s => s.id);
    localStorage.setItem("quickstart-completed", JSON.stringify(completedIds));
  };

  const hideWidget = () => {
    setIsVisible(false);
    localStorage.setItem("quickstart-visible", "false");
  };

  const completedCount = steps.filter(s => s.completed).length;
  const progress = (completedCount / steps.length) * 100;

  if (!isVisible) return null;

  return (
    <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-800 dark:to-gray-900 border border-orange-200 dark:border-gray-700 rounded-xl p-6 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-orange-500" />
            Inicio Rápido
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Completa estos pasos para empezar a vender
          </p>
        </div>
        <button
          onClick={hideWidget}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-gray-600 dark:text-gray-400">Progreso</span>
          <span className="font-medium text-gray-900 dark:text-white">
            {completedCount} de {steps.length} completados
          </span>
        </div>
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-orange-400 to-orange-600 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {steps.map((step) => (
          <div
            key={step.id}
            className={`flex items-center gap-4 p-3 rounded-lg transition-all ${
              step.completed 
                ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800" 
                : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-orange-300 dark:hover:border-orange-700"
            }`}
          >
            <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
              step.completed 
                ? "bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400" 
                : "bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400"
            }`}>
              {step.completed ? <CheckCircle2 className="w-5 h-5" /> : step.icon}
            </div>
            
            <div className="flex-1">
              <h4 className={`font-medium ${
                step.completed 
                  ? "text-green-700 dark:text-green-400 line-through" 
                  : "text-gray-900 dark:text-white"
              }`}>
                {step.title}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {step.description}
              </p>
            </div>

            {!step.completed && (
              <Link
                href={step.href}
                onClick={() => markAsComplete(step.id)}
                className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 transition-colors"
              >
                Empezar
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        ))}
      </div>

      {completedCount === steps.length && (
        <div className="mt-4 p-3 bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-sm text-green-700 dark:text-green-400 font-medium">
            🎉 ¡Felicidades! Has completado todos los pasos iniciales.
          </p>
        </div>
      )}
    </div>
  );
}
