"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "./nav-items";
import { isNavItemActive } from "./is-active";
import { clsx } from "clsx";

export function BottomNav({ role, attentionCount = 0 }: { role: string; attentionCount?: number }) {
  const pathname = usePathname();
  const canManageFinances = role === "owner" || role === "admin";
  const navItems = NAV_ITEMS.filter((item) => !item.adminOnly || canManageFinances);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex justify-center pb-[calc(env(safe-area-inset-bottom)+0.75rem)] md:hidden"
      aria-label="Primary"
    >
      <div className="flex items-center gap-0.5 rounded-full border border-neutral-200/80 bg-white/90 px-1.5 py-1.5 shadow-lg shadow-black/5 backdrop-blur-md dark:border-neutral-800/80 dark:bg-neutral-900/90">
        {navItems.map((item) => {
          const active = isNavItemActive(pathname, item.href);
          const Icon = item.icon;
          const showBadge = item.href === "/" && attentionCount > 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "relative flex flex-col items-center gap-0.5 rounded-full px-3.5 py-2 text-[10px] font-medium transition-colors",
                active
                  ? "bg-[#4F9FE0] text-white"
                  : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100",
              )}
            >
              <span className="relative">
                <Icon className="h-5 w-5" strokeWidth={active ? 2.25 : 2} />
                {showBadge ? (
                  <span className="absolute -right-1.5 -top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 ring-2 ring-white dark:ring-neutral-900" />
                ) : null}
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
