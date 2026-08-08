import { addDays } from "./calendar-dates";
import type { PaymentTerms } from "@/types/database";

export const PAYMENT_TERMS_OPTIONS: PaymentTerms[] = [
  "Due on Receipt",
  "7 days",
  "14 days",
  "30 days",
];

const TERMS_DAYS: Record<PaymentTerms, number> = {
  "Due on Receipt": 0,
  "7 days": 7,
  "14 days": 14,
  "30 days": 30,
};

export function dueDateFromTerms(issueDate: string, terms: PaymentTerms): string {
  return addDays(issueDate, TERMS_DAYS[terms]);
}
