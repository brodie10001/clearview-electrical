"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { Zap, LogOut } from "lucide-react";
import { NAV_ITEMS } from "./nav-items";
import { isNavItemActive } from "./is-active";
import { signOut } from "@/lib/supabase/actions";

interface SidebarProps {
  displayName: string;
  role: string;
}

export function Sidebar({ displayName, role }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-neutral-200 bg-white px-4 py-6 md:flex dark:border-neutral-800 dark:bg-neutral-900">
      <div className="mb-8 flex items-center gap-2.5 px-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500 text-white">
          <Zap className="h-5 w-5" fill="currentColor" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
            Clearview
          </p>
          <p className="text-xs text-neutral-500">Electrical Group</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1" aria-label="Primary">
        {NAV_ITEMS.map((item) => {
          const active = isNavItemActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                  : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100",
              )}
            >
              <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.25 : 2} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex items-center gap-2.5 border-t border-neutral-200 pt-4 dark:border-neutral-800">
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
