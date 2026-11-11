import type React from "react";

export function ModuleLayout({ title, description, action, children }: React.PropsWithChildren<{ title: string; description: string; action?: React.ReactNode }>) {
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h3 className="text-3xl font-semibold tracking-normal">{title}</h3>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}
