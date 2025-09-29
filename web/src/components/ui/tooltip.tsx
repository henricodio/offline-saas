"use client";

import * as React from "react";

type TooltipContextValue = {
  open: boolean;
  setOpen: (v: boolean) => void;
};
const TooltipContext = React.createContext<TooltipContextValue | null>(null);

export function TooltipProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function Tooltip({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  return (
    <TooltipContext.Provider value={{ open, setOpen }}>
      <div className="relative inline-block">{children}</div>
    </TooltipContext.Provider>
  );
}

export function TooltipTrigger({ asChild, children }: { asChild?: boolean; children: React.ReactElement }) {
  const ctx = React.useContext(TooltipContext);
  if (!ctx) return <>{children}</>;
  const props = {
    onMouseEnter: () => ctx.setOpen(true),
    onMouseLeave: () => ctx.setOpen(false),
    onFocus: () => ctx.setOpen(true),
    onBlur: () => ctx.setOpen(false),
  } as const;
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, props);
  }
  return <span {...props} className="inline-block">{children}</span>;
}

export function TooltipContent({ children, className }: { children: React.ReactNode; className?: string }) {
  const ctx = React.useContext(TooltipContext);
  if (!ctx) return null;
  if (!ctx.open) return null;
  return (
    <div className={"pointer-events-none absolute z-50 -translate-x-1/2 left-1/2 mt-2 rounded-md bg-black/80 text-white text-xs px-2 py-1 shadow " + (className || "")} role="tooltip">
      {children}
    </div>
  );
}
