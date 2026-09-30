"use client";

import { useState } from "react";
import {
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  Search,
  UserRound,
} from "lucide-react";

import { clearSession, getCurrentUser } from "@/lib/auth/session";

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const [profileOpen, setProfileOpen] = useState(false);

  const user = getCurrentUser();

  const displayName = user?.fullName?.trim() || user?.username || "User";

  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  function handleLogout() {
    clearSession();
    window.location.href = "/login";
  }

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-border bg-white/90 backdrop-blur">
      <div className="flex h-full items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onMenuClick}
            aria-label="Open navigation"
            className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="hidden items-center gap-2 rounded-xl border border-border bg-slate-50 px-3 py-2 sm:flex sm:w-[260px] lg:w-[320px]">
            <Search className="h-4 w-4 text-slate-400" />

            <input
              type="search"
              placeholder="Search anything..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
            />

            <kbd className="hidden rounded-md border border-border bg-white px-1.5 py-0.5 text-[10px] text-slate-400 lg:inline">
              /
            </kbd>
          </div>

          <div className="truncate text-sm font-medium text-slate-600 sm:hidden">
            Comp<span className="text-primary">Flow</span>
          </div>
        </div>

        <div className="relative flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            className="relative rounded-xl p-2.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />

            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary ring-2 ring-white" />
          </button>

          <div className="hidden h-8 w-px bg-border sm:block" />

          <button
            type="button"
            onClick={() => setProfileOpen((current) => !current)}
            aria-expanded={profileOpen}
            aria-haspopup="menu"
            className="flex items-center gap-3 rounded-xl px-2 py-1.5 transition hover:bg-slate-100"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
              {initials || <UserRound className="h-4 w-4" />}
            </div>

            <div className="hidden min-w-0 text-left md:block">
              <div className="max-w-[180px] truncate text-sm font-semibold text-slate-900">
                {displayName}
              </div>

              <div className="text-[11px] text-slate-500">
                {user?.role ?? "User"}
              </div>
            </div>

            <ChevronDown
              className={`hidden h-4 w-4 text-slate-400 transition-transform md:block ${
                profileOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {profileOpen && (
            <div
              role="menu"
              className="absolute right-0 top-[calc(100%+10px)] z-50 w-72 overflow-hidden rounded-2xl border border-border bg-white shadow-xl"
            >
              <div className="border-b border-border px-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                    {initials || <UserRound className="h-4 w-4" />}
                  </div>

                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-900">
                      {displayName}
                    </div>

                    <div className="truncate text-xs text-slate-500">
                      {user?.username ?? "No username"}
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-slate-50 px-3 py-2">
                    <div className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                      Role
                    </div>

                    <div className="mt-1 truncate text-xs font-semibold text-slate-700">
                      {user?.role ?? "—"}
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-50 px-3 py-2">
                    <div className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                      Branch
                    </div>

                    <div className="mt-1 truncate text-xs font-semibold text-slate-700">
                      {user?.branch?.name ?? "Unassigned"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-2">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-rose-600 transition hover:bg-rose-50"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
