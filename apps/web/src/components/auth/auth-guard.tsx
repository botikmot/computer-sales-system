"use client";

import { useEffect, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";

const TOKEN_KEY = "compflow_access_token";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);

  return () => {
    window.removeEventListener("storage", callback);
  };
}

function getSnapshot() {
  return localStorage.getItem(TOKEN_KEY);
}

function getServerSnapshot() {
  return undefined;
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const token = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const isResolved = token !== undefined;
  const isAuthenticated = Boolean(token);
  const isLoginPage = pathname === "/login";

  useEffect(() => {
    // Wait until the client has resolved the auth state.
    if (!isResolved) {
      return;
    }

    // Authenticated users should never stay on /login.
    if (isLoginPage) {
      if (isAuthenticated) {
        router.replace("/");
      }

      return;
    }

    // Protected routes require authentication.
    if (!isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoginPage, isResolved, router]);

  // Auth state is still being resolved.
  if (!isResolved) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-sm text-muted">Loading CompFlow...</div>
      </div>
    );
  }

  // Redirect states should not render the wrong page.
  if (isLoginPage && isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-sm text-muted">Loading CompFlow...</div>
      </div>
    );
  }

  if (!isLoginPage && !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-sm text-muted">Loading CompFlow...</div>
      </div>
    );
  }

  return <>{children}</>;
}
