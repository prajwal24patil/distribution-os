"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/projects", label: "Projects" },
  { href: "/projects/new", label: "New Project" },
];

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === "/login" || pathname === "/signup") {
    return <>{children}</>;
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-stone-100 text-neutral-950">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-neutral-300 bg-white lg:block">
        <div className="flex h-full flex-col">
          <div className="border-b border-neutral-300 px-5 py-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">v0.1</p>
            <h1 className="mt-2 text-xl font-semibold">DistributionOS</h1>
          </div>

          <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
            {navItems.map((item) => {
              const isActive =
                item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded px-3 py-2 text-sm font-medium transition ${
                    isActive
                      ? "bg-neutral-950 text-white"
                      : "text-neutral-700 hover:bg-neutral-100 hover:text-neutral-950"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-neutral-300 px-5 py-4">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Customer</p>
            <p className="mt-1 text-sm font-semibold text-neutral-900">CareerScore</p>
            <button
              className="mt-4 h-9 w-full rounded border border-neutral-300 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-100"
              type="button"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 border-b border-neutral-300 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
          <div className="flex flex-col gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">v0.1</p>
              <p className="text-lg font-semibold">DistributionOS</p>
            </div>
            <nav className="flex gap-2 overflow-x-auto">
              {navItems.map((item) => {
                const isActive =
                  item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`whitespace-nowrap rounded border px-3 py-2 text-sm font-medium ${
                      isActive
                        ? "border-neutral-950 bg-neutral-950 text-white"
                        : "border-neutral-300 bg-white text-neutral-700"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <button
              className="h-9 w-fit rounded border border-neutral-300 px-3 text-sm font-semibold text-neutral-700"
              type="button"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        </header>

        <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
