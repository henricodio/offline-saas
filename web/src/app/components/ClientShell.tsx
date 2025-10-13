"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LayoutDashboard, ShoppingCart, Users, Package, Calendar, X, Sun, Moon, MapPin, Menu } from "lucide-react";
import { useTheme } from "next-themes";

function NavLink({ href, label, icon: Icon }: { href: string; label: string; icon: React.ComponentType<{ size?: number }>; }) {
  const pathname = usePathname();
  const active = pathname === href || (href !== "/" && pathname.startsWith(href));
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className="nav-link"
    >
      <Icon size={18} />
      <span>{label}</span>
    </Link>
  );
}

export default function ClientShell({ children }: { children: React.ReactNode }) {
const [open, setOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const [rot, setRot] = useState(0);

  const SidebarContent = (
    <>
      <div className="px-2 py-3">
        <Link href="/" aria-label="FAKTO" className="inline-block text-[var(--sidebar-foreground)] transition-all hover:scale-105 animate-pulse">
          <svg viewBox="0 0 200 60" xmlns="http://www.w3.org/2000/svg" className="h-10 w-auto">
            {/* Icono de micrófono ultra minimalista */}
            <circle cx="35" cy="25" r="4" fill="none" stroke="#f97316" strokeWidth="1.5" />
            <line x1="35" y1="29" x2="35" y2="35" stroke="#f97316" strokeWidth="1.5" />
            <line x1="31" y1="38" x2="39" y2="38" stroke="#f97316" strokeWidth="1.5" />
            {/* Texto FAKTO */}
            <text x="70" y="40" fontFamily="Helvetica, Arial, sans-serif" fontSize="24" fontWeight="100" fill="currentColor" letterSpacing="4px">FAKTO</text>
          </svg>
        </Link>
      </div>
      <nav className="flex-1 flex flex-col gap-1">
        <NavLink href="/" label="Dashboard" icon={LayoutDashboard} />
        <NavLink href="/orders" label="Pedidos" icon={ShoppingCart} />
        <NavLink href="/clients" label="Clientes" icon={Users} />
        <NavLink href="/products" label="Productos" icon={Package} />
        <NavLink href="/tasks" label="Tareas" icon={Calendar} />
        <NavLink href="/mapa" label="Mapa" icon={MapPin} />
      </nav>
      <div className="mt-auto px-2 py-3 text-xs text-[var(--sidebar-foreground)]/70">
        © {new Date().getFullYear()} FAKTO
      </div>
    </>
  );

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
      {/* Sidebar desktop */}
      <aside className="sidebar p-3">
        {SidebarContent}
      </aside>

      {/* Mobile drawer */}
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden animate__animated animate__fadeIn animate__faster">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-[85%] max-w-[320px] bg-[var(--sidebar)] shadow-2xl flex flex-col animate__animated animate__slideInLeft animate__faster">
            <div className="p-4 border-b border-[var(--sidebar-border)]">
              <button
                aria-label="Cerrar menú"
                className="inline-flex items-center gap-2 text-sm text-[var(--sidebar-foreground)]/80 hover:text-[var(--sidebar-foreground)] transition-colors"
                onClick={() => setOpen(false)}
              >
                <X size={18} /> Cerrar menú
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              {SidebarContent}
            </div>
          </div>
        </div>
      ) : null}

      {/* Main column */}
      <div className="flex min-h-screen flex-col">
        {/* Visual indicator that changes are applied - REMOVE AFTER TESTING */}
        {/* <div className="bg-green-500 text-white text-center py-1 text-sm font-medium animate-bounce">
          ✨ Estilos mejorados aplicados - Efectos glass activos ✨
        </div> */}
        <header className="topbar">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
            {/* Botón hamburguesa móvil */}
            <button
              type="button"
              className="lg:hidden btn btn-ghost btn-sm"
              onClick={() => setOpen(true)}
              aria-label="Abrir menú"
            >
              <Menu size={20} />
            </button>
            
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                aria-label="Cambiar tema"
                className="inline-flex items-center gap-2 btn btn-ghost btn-sm"
                onClick={() => {
                  setTheme(theme === "dark" ? "light" : "dark");
                  setRot((r) => r + 1);
                }}
                style={{
                  transform: `rotate(${rot * 180}deg) scale(${theme === 'dark' ? 1.1 : 1})`,
                  transition: "transform .4s ease",
                  boxShadow: theme === 'dark' ? '0 0 10px rgba(249, 115, 22, 0.5)' : 'none'
                }}
              >
                {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
                <span className="hidden md:inline">Tema</span>
              </button>
              {/* Espaciador / acciones adicionales aquí si se necesitan */}
            </div>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
