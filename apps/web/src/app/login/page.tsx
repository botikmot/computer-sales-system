import type { Metadata } from "next";

import { LoginForm } from "@/features/auth/login-form";
import { LockKeyhole } from "lucide-react";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="grid min-h-screen lg:grid-cols-[1.15fr_0.85fr]">
        {/* Brand panel */}
        <section className="relative hidden overflow-hidden bg-slate-950 lg:flex">
          <div className="absolute inset-0">
            <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-blue-600/20 blur-3xl" />
            <div className="absolute -bottom-32 -right-24 h-[28rem] w-[28rem] rounded-full bg-indigo-500/15 blur-3xl" />
          </div>

          <div className="relative flex w-full flex-col justify-between p-12 xl:p-16">
            <div>
              <div className="text-2xl font-bold tracking-tight text-white">
                Comp<span className="text-blue-400">Flow</span>
              </div>

              <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                Business Operations
              </p>
            </div>

            <div className="max-w-xl">
              <p className="text-sm font-semibold text-blue-400">
                Everything in one flow.
              </p>

              <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight text-white xl:text-5xl">
                Run your computer business with confidence.
              </h1>

              <p className="mt-5 max-w-lg text-base leading-7 text-slate-400">
                Manage sales, inventory, purchasing, repairs, payments, and
                business reports from one connected workspace.
              </p>

              <div className="mt-8 grid max-w-md grid-cols-2 gap-3">
                {[
                  "Sales & quotations",
                  "Inventory & assembly",
                  "Service & repairs",
                  "Finance & reports",
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-slate-300"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <p className="text-xs text-slate-600">
              CompFlow · Computer Sales & Operations System
            </p>
          </div>
        </section>

        {/* Login panel */}
        <section className="flex items-center justify-center px-5 py-10 sm:px-8">
          <div className="w-full max-w-md">
            <div className="mb-8 lg:hidden">
              <div className="text-2xl font-bold tracking-tight text-slate-950">
                Comp<span className="text-primary">Flow</span>
              </div>

              <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                Business Operations
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_12px_40px_rgba(15,23,42,0.08)] sm:p-8">
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-primary">
                  <LockKeyhole className="h-5 w-5" />
                </div>

                <h2 className="mt-6 text-2xl font-bold tracking-tight text-slate-950">
                  Welcome back!
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Sign in to access your CompFlow workspace.
                </p>
              </div>

              <div className="mt-7">
                <LoginForm />
              </div>

              <p className="mt-6 text-center text-xs leading-5 text-slate-400">
                Your account access and permissions are managed by your system
                administrator.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
