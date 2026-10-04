/**
 * Empty state generico (sem posts publicados / sem discussions).
 */
import { FileText } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
}

export function EmptyState({ title, description, icon }: EmptyStateProps) {
  return (
    <div className="bg-card border border-border rounded-2xl p-12 text-center space-y-3">
      {icon ?? <FileText className="w-10 h-10 text-muted-foreground/40 mx-auto" />}
      <p className="text-lg font-black text-foreground">{title}</p>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}