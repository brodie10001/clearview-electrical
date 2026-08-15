import { Home, Building2, Factory } from "lucide-react";
import type { PropertyType } from "@/types/database";

// Shared between the Jobs and Properties list cards so a property type
// means the same colour everywhere in the app, not a one-off palette per
// page. Avoids orange/red/green -- those already carry "needs
// attention"/"overdue"/"done" meaning elsewhere in the app (Needs
// Attention widget, job status rail), so reusing one here would create a
// false "something's wrong" read on an Industrial property.
export const PROPERTY_TYPE_ICONS: Record<PropertyType, typeof Home> = {
  residential: Home,
  commercial: Building2,
  industrial: Factory,
};

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  residential: "Residential",
  commercial: "Commercial",
  industrial: "Industrial",
};

export const PROPERTY_TYPE_COLORS: Record<PropertyType, { icon: string; badge: string }> = {
  residential: {
    icon: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
    badge: "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
  },
  commercial: {
    icon: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
    badge: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  },
  industrial: {
    icon: "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400",
    badge: "bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400",
  },
};
