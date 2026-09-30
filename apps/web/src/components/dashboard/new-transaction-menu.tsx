"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ClipboardList,
  Package,
  ShoppingCart,
  Wrench,
  X,
} from "lucide-react";

type TransactionAction = {
  label: string;
  description: string;
  icon: typeof ClipboardList;
  href?: string;
};

const actions: TransactionAction[] = [
  {
    label: "New Inquiry",
    description: "Start a new customer inquiry",
    icon: ClipboardList,
    href: "/sales/inquiries/new",
  },
  {
    label: "New Quotation",
    description: "Prepare a customer quotation",
    icon: ClipboardList,
  },
  {
    label: "New Sales Order",
    description: "Create a confirmed sales order",
    icon: ShoppingCart,
  },
  {
    label: "New Service Job",
    description: "Start a repair or service job",
    icon: Wrench,
  },
  {
    label: "Receive Stock",
    description: "Record incoming inventory",
    icon: Package,
  },
];

export function NewTransactionMenu({ onClose }: { onClose: () => void }) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);

      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-slate-950/10 backdrop-blur-[1px] sm:hidden" />

      <div
        ref={menuRef}
        className="absolute right-0 top-[calc(100%+10px)] z-50 w-[min(92vw,380px)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10"
      >
        <div className="flex items-start justify-between border-b border-slate-100 px-4 py-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-950">
              New Transaction
            </h3>

            <p className="mt-0.5 text-xs text-slate-500">
              Start a new business transaction
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close transaction menu"
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-1 p-2">
          {actions.map((action) => {
            const Icon = action.icon;

            if (action.href) {
              return (
                <Link
                  key={action.label}
                  href={action.href}
                  onClick={onClose}
                  className="group flex items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-blue-50"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition group-hover:bg-blue-100 group-hover:text-primary">
                    <Icon className="h-4.5 w-4.5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-800">
                      {action.label}
                    </p>

                    <p className="mt-0.5 text-xs text-slate-400">
                      {action.description}
                    </p>
                  </div>

                  <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:text-primary" />
                </Link>
              );
            }

            return (
              <div
                key={action.label}
                className="flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-3 opacity-50"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                  <Icon className="h-4.5 w-4.5" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-700">
                    {action.label}
                  </p>

                  <p className="mt-0.5 text-xs text-slate-400">
                    {action.description}
                  </p>
                </div>

                <span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-slate-400">
                  Soon
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
