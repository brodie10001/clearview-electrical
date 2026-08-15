"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { Zap, LogOut } from "lucide-react";
import { NAV_ITEMS } from "./nav-items";
import { isNavItemActive } from "./is-active";
import { signOut } from "@/lib/supabase/actions";

interface SidebarProps {
  businessName: string;
  displayName: string;
  role: string;
  attentionCount?: number;
}

export function Sidebar({ businessName, displayName, role, attentionCount = 0 }: SidebarProps) {
  const pathname = usePathname();
  const canManageFinances = role === "owner" || role === "admin";
  const navItems = NAV_ITEMS.filter((item) => !item.adminOnly || canManageFinances);

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-neutral-200 bg-white px-3 py-5 md:flex dark:border-neutral-800 dark:bg-neutral-900">
      <div className="mb-6 flex items-center gap-2.5 px-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-sm shadow-amber-500/30">
          <Zap className="h-5 w-5" fill="currentColor" />
        </div>
        <p className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-50">
          {businessName}
        </p>
      </div>

      <p className="mb-1.5 px-2.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
        Main
      </p>
      <nav className="flex flex-1 flex-col gap-0.5" aria-label="Primary">
        {navItems.map((item) => {
          const active = isNavItemActive(pathname, item.href);
          const Icon = item.icon;
          const showBadge = item.href === "/" && attentionCount > 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              data-tour={item.href === "/jobs" ? "nav-jobs" : undefined}
              className={clsx(
                "group relative flex items-center gap-3 rounded-xl px-2.5 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-amber-500/10 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400"
                  : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100",
              )}
            >
              {active ? (
                <span className="absolute inset-y-1.5 left-0 w-1 rounded-r-full bg-amber-500" />
              ) : null}
              <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.25 : 2} />
              <span className="flex-1">{item.label}</span>
              {showBadge ? (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                  {attentionCount > 9 ? "9+" : attentionCount}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex items-center gap-2.5 rounded-xl border border-neutral-200 p-2.5 dark:border-neutral-800">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-xs font-semibold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
          {displayName.slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-50">
            {displayName}
          </p>
          <p className="truncate text-xs capitalize text-neutral-500">{role}</p>
        </div>
        <form action={signOut}>
          <button
            type="submit"
            title="Sign out"
            className="rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </form>
      </div>
    </aside>
  );
}
