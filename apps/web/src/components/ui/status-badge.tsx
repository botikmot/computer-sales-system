type StatusBadgeProps = {
  status: string;
};

const statusStyles: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-600",
  OPEN: "bg-blue-50 text-blue-700",
  SENT: "bg-blue-50 text-blue-700",
  ACCEPTED: "bg-emerald-50 text-emerald-700",
  CONFIRMED: "bg-violet-50 text-violet-700",
  RESERVED: "bg-indigo-50 text-indigo-700",
  READY: "bg-amber-50 text-amber-700",
  DELIVERED: "bg-emerald-50 text-emerald-700",
  POSTED: "bg-blue-50 text-blue-700",
  PAID: "bg-emerald-50 text-emerald-700",
  PARTIALLY_PAID: "bg-amber-50 text-amber-700",
  PENDING: "bg-amber-50 text-amber-700",
  COMPLETED: "bg-emerald-50 text-emerald-700",
  CANCELLED: "bg-rose-50 text-rose-700",
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const className = statusStyles[status] ?? "bg-slate-100 text-slate-600";

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide ${className}`}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}
