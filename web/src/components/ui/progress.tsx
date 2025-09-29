import * as React from "react";

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number; // 0-100
}

export function Progress({ className, value = 0, ...props }: ProgressProps) {
  const v = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className={["w-full bg-gray-200 rounded-full overflow-hidden", className].filter(Boolean).join(" ")} {...props}>
      <div className="bg-orange-500 h-2 transition-all duration-300" style={{ width: `${v}%` }} />
    </div>
  );
}
