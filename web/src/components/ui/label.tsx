import * as React from "react";

export const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(({ className, ...props }, ref) => {
  return <label ref={ref} className={["block text-sm font-medium text-[var(--foreground)]", className].filter(Boolean).join(" ")} {...props} />;
});
Label.displayName = "Label";
