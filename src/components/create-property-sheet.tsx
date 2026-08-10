"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Dialog } from "@/components/ui/dialog";
import { PropertyForm, type PropertyCustomerOption } from "@/components/property-form";
import { CustomerForm } from "@/components/customer-form";

export interface CreatedProperty {
  id: string;
  address: string;
  customerId: string;
  customerName: string;
}

// Stacks two sheets: the property-creation form, and (opened from within it
// via "+ Create new customer") a customer-creation form on top of that.
// Both forms stay mounted and keep their entered values the whole time --
// only the customer sheet ever unmounts/remounts, since it's the one that
// opens and closes independently on top.
export function CreatePropertySheet({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (property: CreatedProperty) => void;
}) {
  const [customers, setCustomers] = useState<PropertyCustomerOption[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [customerSheetOpen, setCustomerSheetOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const supabase = createClient();
    supabase
      .from("customers")
      .select("id, name")
      .order("name")
      .then(({ data }) => setCustomers(data ?? []));
  }, [open]);

  return (
    <>
      <Dialog
        open={open}
        title="New property"
        onClose={() => {
          // While the customer sheet is stacked on top, Escape shouldn't
          // also close this one -- let the customer dialog's own handler
          // (registered separately) close just the top sheet.
          if (!customerSheetOpen) onClose();
        }}
      >
        <PropertyForm
          mode="embedded"
          customers={customers}
          customerId={customerId}
          onCustomerIdChange={setCustomerId}
          onCreateNewCustomer={() => setCustomerSheetOpen(true)}
          onCancel={onClose}
          onCreated={(property) => {
            const customerName = customers.find((c) => c.id === property.customerId)?.name ?? "";
            onCreated({ ...property, customerName });
          }}
        />
      </Dialog>

      <Dialog
        open={customerSheetOpen}
        title="New customer"
        onClose={() => setCustomerSheetOpen(false)}
      >
        <CustomerForm
          mode="embedded"
          onCancel={() => setCustomerSheetOpen(false)}
          onCreated={(customer) => {
            setCustomers((prev) => [...prev, customer].sort((a, b) => a.name.localeCompare(b.name)));
            setCustomerId(customer.id);
            setCustomerSheetOpen(false);
          }}
        />
      </Dialog>
    </>
  );
}
