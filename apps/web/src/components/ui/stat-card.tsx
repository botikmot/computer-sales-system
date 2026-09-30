import type { ComponentType } from "react";

type StatCardProps = {
  label: string;
  value: string;
  detail?: string;
  trend?: string;
  trendUp?: boolean;
  icon: ComponentType<{ className?: string }>;
  iconClassName?: string;
};

export function StatCard({
  label,
  value,
  detail,
  trend,
  trendUp,
  icon: Icon,
  iconClassName = "bg-blue-50 text-blue-600",
}: StatCardProps) {
  return (
    <article className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{label}</p>

          <p className="mt-2 truncate text-2xl font-bold tracking-tight text-slate-950">
            {value}
          </p>
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconClassName}`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>

      {(detail || trend) && (
        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="truncate text-xs text-slate-500">{detail}</p>

          {trend && (
            <span
              className={[
                "shrink-0 text-xs font-semibold",
                trendUp ? "text-emerald-600" : "text-slate-500",
              ].join(" ")}
            >
              {trend}
            </span>
          )}
        </div>
      )}
    </article>
  );
}
