"use client";

import { useState } from "react";

import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

//const SIDEBAR_WIDTH = 272;

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div
        className="min-h-screen transition-[padding] duration-200"
        style={{ paddingLeft: `0` }}
      >
        <div className="lg:pl-[272px]">
          <Topbar onMenuClick={() => setMobileOpen(true)} />

          <main className="min-h-[calc(100vh-4rem)] px-4 py-5 sm:px-6 lg:px-8">
            <div className="mx-auto w-full max-w-[1600px]">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
