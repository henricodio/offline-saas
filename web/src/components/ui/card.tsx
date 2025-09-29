import * as React from "react";

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => {
  return <div ref={ref} className={["card", className].filter(Boolean).join(" ")} {...props} />;
});
Card.displayName = "Card";
