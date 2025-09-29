import * as React from "react";

type Variant = "default" | "ghost" | "outline";
type Size = "sm" | "md" | "icon";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

function clsx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", ...props }, ref) => {
    const base = "inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] rounded-md";
    const variants: Record<Variant, string> = {
      default: "bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[color-mix(in_oklab,var(--primary)_85%,_black_15%)]",
      ghost: "bg-transparent hover:bg-[var(--muted)] text-[var(--foreground)]",
      outline: "border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:bg-[var(--muted)]",
    };
    const sizes: Record<Size, string> = {
      sm: "h-8 px-3 py-1 text-sm",
      md: "h-9 px-4 py-2 text-sm",
      icon: "h-9 w-9",
    };
    return (
      <button ref={ref} className={clsx(base, variants[variant], sizes[size], className)} {...props} />
    );
  }
);
Button.displayName = "Button";
