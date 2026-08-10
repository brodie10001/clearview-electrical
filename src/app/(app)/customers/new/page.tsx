import { CustomerForm } from "@/components/customer-form";

export default function NewCustomerPage() {
  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 p-4 sm:p-6">
      <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
        New Customer
      </h1>

      <CustomerForm mode="page" />
    </div>
  );
}
