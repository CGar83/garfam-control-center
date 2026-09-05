import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  secondaryAction?: ReactNode;
}

export function PageHeader({ title, description, action, secondaryAction }: PageHeaderProps) {
  return (
    <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-wrap-safe text-3xl font-semibold leading-tight tracking-normal text-foreground sm:text-4xl">{title}</h1>
        {description ? <p className="text-wrap-safe mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p> : null}
      </div>
      {secondaryAction || action ? (
        <div className="app-toolbar shrink-0 sm:justify-end">
          {secondaryAction}
          {action}
        </div>
      ) : null}
    </div>
  );
}
