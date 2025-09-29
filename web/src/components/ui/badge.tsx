import * as React from "react";

type Variant = "default" | "outline";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(({ className, variant = "default", ...props }, ref) => {
  const base = "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium";
  const variants: Record<Variant, string> = {
    default: "bg-[var(--muted)] text-[var(--muted-foreground)]",
    outline: "border border-[var(--border)] text-[var(--foreground)]",
  };
  return <span ref={ref} className={[base, variants[variant], className].filter(Boolean).join(" ")} {...props} />;
});
Badge.displayName = "Badge";
