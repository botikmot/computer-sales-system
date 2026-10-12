"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import {
  Bell,
  ChevronDown,
  ExternalLink,
  LogOut,
  Menu,
  Search,
  UserRound,
} from "lucide-react";

import { apiFetch } from "@/lib/api/client";
import { clearSession, getCurrentUser } from "@/lib/auth/session";

type PendingAction = {
  id: string;
  type: string;
  title: string;
  reference: string;
  description: string;
  href: string;
  actionLabel: string;
  branchName: string;
  createdAt: string;
};

type PendingActionsResponse = {
  items: PendingAction[];
  count: number;
};

type GlobalSearchResult = {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  status?: string;
  href: string;
  createdAt: string;
};

type GlobalSearchResponse = {
  items: GlobalSearchResult[];
  count: number;
};

type BrowserPermissionState = NotificationPermission | "unsupported";

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const [profileOpen, setProfileOpen] = useState(false);

  const user = getCurrentUser();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GlobalSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedSearchIndex, setSelectedSearchIndex] = useState(-1);

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
  const [notificationError, setNotificationError] = useState<string | null>(
    null,
  );
  const [browserPermission, setBrowserPermission] =
    useState<BrowserPermissionState>("default");

  const seenIdsRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    let active = true;

    async function refreshPendingActions() {
      try {
        const result = await apiFetch<PendingActionsResponse>(
          "/notifications/pending-actions",
        );

        if (!active) return;

        const items = Array.isArray(result.items) ? result.items : [];
        const previousIds = seenIdsRef.current;

        // Notify only about items appearing after the first successful load.
        if (
          previousIds &&
          "Notification" in window &&
          window.Notification.permission === "granted"
        ) {
          const newItems = items.filter((item) => !previousIds.has(item.id));

          // Limit browser pop-ups if several items arrive at once.
          for (const item of newItems.slice(0, 3)) {
            const notification = new window.Notification(item.title, {
              body: `${item.reference} · ${item.branchName}`,
              tag: item.id,
            });

            notification.onclick = () => {
              window.focus();
              window.location.href = item.href;
              notification.close();
            };
          }
        }

        seenIdsRef.current = new Set(items.map((item) => item.id));
        setPendingActions(items);
        setNotificationError(null);
      } catch (error) {
        if (active) {
          setNotificationError(
            error instanceof Error
              ? error.message
              : "Unable to load pending actions.",
          );
        }
      }
    }

    void refreshPendingActions();

    const intervalId = window.setInterval(() => {
      void refreshPendingActions();
    }, 30_000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (!searchOpen) return;

    let cancelled = false;
    const query = searchQuery.trim();

    const timer = window.setTimeout(
      () => {
        if (query.length < 2) {
          setSearchResults([]);
          setSearchError(null);
          setSearchLoading(false);
          setSelectedSearchIndex(-1);
          return;
        }

        setSearchLoading(true);
        setSearchError(null);

        void apiFetch<GlobalSearchResponse>(
          `/search?q=${encodeURIComponent(query)}`,
        )
          .then((result) => {
            if (cancelled) return;

            setSearchResults(Array.isArray(result.items) ? result.items : []);
            setSelectedSearchIndex(-1);
          })
          .catch((error: unknown) => {
            if (cancelled) return;

            setSearchResults([]);
            setSearchError(
              error instanceof Error
                ? error.message
                : "Unable to search records.",
            );
          })
          .finally(() => {
            if (!cancelled) {
              setSearchLoading(false);
            }
          });
      },
      query.length < 2 ? 0 : 300,
    );

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [searchQuery, searchOpen]);

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setSearchOpen(false);
      setSelectedSearchIndex(-1);
      return;
    }

    if (event.key === "ArrowDown" && searchResults.length > 0) {
      event.preventDefault();

      setSelectedSearchIndex((current) =>
        current >= searchResults.length - 1 ? 0 : current + 1,
      );

      return;
    }

    if (event.key === "ArrowUp" && searchResults.length > 0) {
      event.preventDefault();

      setSelectedSearchIndex((current) =>
        current <= 0 ? searchResults.length - 1 : current - 1,
      );

      return;
    }

    if (event.key === "Enter" && searchResults.length > 0) {
      event.preventDefault();

      const index = selectedSearchIndex >= 0 ? selectedSearchIndex : 0;

      const result = searchResults[index];

      if (result) {
        setSearchOpen(false);
        setSearchQuery("");
        window.location.assign(result.href);
      }
    }
  }

  async function enableBrowserNotifications() {
    if (!("Notification" in window)) {
      setBrowserPermission("unsupported");
      return;
    }

    try {
      const permission = await window.Notification.requestPermission();
      setBrowserPermission(permission);
    } catch {
      setNotificationError(
        "Unable to request browser notification permission.",
      );
    }
  }

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

          <div className="relative hidden items-center gap-2 rounded-xl border border-border bg-slate-50 px-3 py-2 sm:flex sm:w-[260px] lg:w-[320px]">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />

            <input
              type="search"
              placeholder="Search anything..."
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setSearchOpen(true);
                setSelectedSearchIndex(-1);
              }}
              onFocus={() => setSearchOpen(true)}
              onKeyDown={handleSearchKeyDown}
              aria-label="Search records"
              aria-expanded={searchOpen}
              aria-controls="global-search-results"
              autoComplete="off"
              className="w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-slate-400"
            />

            {searchLoading ? (
              <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-slate-300 border-t-primary" />
            ) : (
              <kbd className="hidden rounded-md border border-border bg-white px-1.5 py-0.5 text-[10px] text-slate-400 lg:inline">
                /
              </kbd>
            )}

            {searchOpen && searchQuery.trim().length > 0 && (
              <div
                id="global-search-results"
                className="absolute left-0 top-[calc(100%+10px)] z-50 w-[min(34rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
              >
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Search Results
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {searchQuery.trim().length < 2
                        ? "Type at least 2 characters"
                        : `${searchResults.length} result${searchResults.length === 1 ? "" : "s"}`}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setSearchResults([]);
                      setSearchError(null);
                      setSearchOpen(false);
                      setSelectedSearchIndex(-1);
                    }}
                    className="rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100"
                  >
                    Clear
                  </button>
                </div>

                <div className="max-h-[60vh] overflow-y-auto">
                  {searchQuery.trim().length < 2 && (
                    <p className="px-4 py-6 text-center text-xs text-slate-500">
                      Enter another character to start searching.
                    </p>
                  )}

                  {searchLoading && (
                    <p className="px-4 py-6 text-center text-xs text-slate-500">
                      Searching records...
                    </p>
                  )}

                  {searchError && !searchLoading && (
                    <p role="alert" className="px-4 py-5 text-sm text-rose-600">
                      {searchError}
                    </p>
                  )}

                  {!searchLoading &&
                    !searchError &&
                    searchQuery.trim().length >= 2 &&
                    searchResults.length === 0 && (
                      <p className="px-4 py-8 text-center text-sm text-slate-500">
                        No matching records found.
                      </p>
                    )}

                  {!searchLoading &&
                    !searchError &&
                    searchResults.map((result, index) => (
                      <Link
                        key={`${result.type}:${result.id}`}
                        href={result.href}
                        onClick={() => {
                          setSearchOpen(false);
                          setSearchQuery("");
                          setSelectedSearchIndex(-1);
                        }}
                        className={`flex items-start gap-3 border-b border-slate-100 px-4 py-3 transition last:border-b-0 ${
                          index === selectedSearchIndex
                            ? "bg-violet-50"
                            : "hover:bg-slate-50"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {result.title}
                          </p>

                          <p className="mt-1 truncate text-xs text-slate-500">
                            {result.type} · {result.subtitle}
                          </p>
                        </div>

                        {result.status && (
                          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">
                            {result.status.replaceAll("_", " ")}
                          </span>
                        )}
                      </Link>
                    ))}
                </div>

                {searchResults.length > 0 && !searchLoading && (
                  <div className="border-t border-slate-100 px-4 py-2">
                    <p className="text-[10px] text-slate-400">
                      Use ↑ ↓ to navigate, Enter to open, Esc to close.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="truncate text-sm font-medium text-slate-600 sm:hidden">
            Comp<span className="text-primary">Flow</span>
          </div>
        </div>

        <div className="relative flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => {
              if (!("Notification" in window)) {
                setBrowserPermission("unsupported");
              } else {
                setBrowserPermission(window.Notification.permission);
              }

              setNotificationsOpen((current) => !current);
              setProfileOpen(false);
            }}
            aria-label={`Notifications, ${pendingActions.length} pending actions`}
            aria-expanded={notificationsOpen}
            aria-haspopup="dialog"
            className="relative rounded-xl p-2.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <Bell className="h-5 w-5" />

            {pendingActions.length > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white ring-2 ring-white">
                {pendingActions.length > 99 ? "99+" : pendingActions.length}
              </span>
            )}
          </button>

          {notificationsOpen && (
            <div
              role="dialog"
              aria-label="Pending actions"
              className="absolute right-0 top-[calc(100%+10px)] z-50 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
            >
              <div className="border-b border-slate-200 px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">
                      Pending Actions
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                      {pendingActions.length} action
                      {pendingActions.length === 1 ? "" : "s"} awaiting
                      attention
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setNotificationsOpen(false)}
                    className="rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100"
                  >
                    Close
                  </button>
                </div>

                <div className="mt-3">
                  {browserPermission === "default" && (
                    <button
                      type="button"
                      onClick={() => void enableBrowserNotifications()}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <Bell className="h-3.5 w-3.5" />
                      Enable browser alerts
                    </button>
                  )}

                  {browserPermission === "granted" && (
                    <p className="text-xs font-medium text-emerald-700">
                      Browser alerts enabled
                    </p>
                  )}

                  {browserPermission === "denied" && (
                    <p className="text-xs text-amber-700">
                      Browser alerts are blocked. Enable them in your browser
                      site settings.
                    </p>
                  )}

                  {browserPermission === "unsupported" && (
                    <p className="text-xs text-slate-500">
                      Browser notifications are not supported here.
                    </p>
                  )}
                </div>
              </div>

              <div className="max-h-[55vh] overflow-y-auto">
                {notificationError && (
                  <p role="alert" className="px-4 py-3 text-xs text-rose-600">
                    {notificationError}
                  </p>
                )}

                {!notificationError && pendingActions.length === 0 && (
                  <div className="px-6 py-10 text-center">
                    <Bell className="mx-auto h-8 w-8 text-slate-300" />
                    <p className="mt-3 text-sm font-semibold text-slate-700">
                      No pending actions
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      You&apos;re all caught up. New actionable items will
                      appear here.
                    </p>
                  </div>
                )}

                {pendingActions.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={() => setNotificationsOpen(false)}
                    className="block border-b border-slate-100 px-4 py-4 transition hover:bg-slate-50"
                  >
                    <div className="flex items-start gap-3">
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-amber-500" />

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-900">
                          {item.title}
                        </p>

                        <p className="mt-1 text-xs font-medium text-violet-700">
                          {item.reference}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {item.description}
                        </p>

                        <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-violet-700">
                          {item.actionLabel}
                          <ExternalLink className="h-3 w-3" />
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="hidden h-8 w-px bg-border sm:block" />

          <button
            type="button"
            onClick={() => {
              setProfileOpen((current) => !current);
              setNotificationsOpen(false);
            }}
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
