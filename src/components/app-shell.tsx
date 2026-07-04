import * as React from "react";
import { cn } from "@/lib/utils";

export function AppShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-h-screen bg-background text-foreground", className)}>{children}</div>
  );
}

export function Container({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("mx-auto w-full max-w-6xl px-4 sm:px-6", className)}>{children}</div>;
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 border-b border-border/60 pb-6 pt-8 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    open: "bg-brand-soft text-brand",
    in_progress: "bg-warning/15 text-warning",
    completed: "bg-success/15 text-success",
    cancelled: "bg-muted text-muted-foreground",
    expired: "bg-destructive/15 text-destructive",
    pending: "bg-warning/15 text-warning",
    held: "bg-brand-soft text-brand",
    released: "bg-success/15 text-success",
    verified: "bg-success/15 text-success",
    unverified: "bg-muted text-muted-foreground",
    rejected: "bg-destructive/15 text-destructive",
    accepted: "bg-success/15 text-success",
    not_submitted: "bg-muted text-muted-foreground",
  };
  const label = status === "in_progress" ? "active" : status.replace(/_/g, " ");
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
        map[status] ?? "bg-muted text-muted-foreground",
      )}
    >
      {label}
    </span>
  );
}
