import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export default function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[var(--muted)] to-[var(--muted)]/50 flex items-center justify-center mb-4 animate-pulse">
        <Icon className="w-10 h-10 text-[var(--muted-foreground)]" strokeWidth={1.5} />
      </div>
      <h3 className="text-lg font-semibold mb-2 text-[var(--foreground)]">{title}</h3>
      <p className="text-sm text-[var(--muted-foreground)] mb-6 max-w-sm leading-relaxed">
        {description}
      </p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
