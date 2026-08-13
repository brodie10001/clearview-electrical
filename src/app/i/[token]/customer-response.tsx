"use client";

import { useState, useTransition } from "react";
import { Check, X } from "lucide-react";
import { respondToInvoice } from "../actions";
import { formatDate } from "@/lib/format";

export function CustomerResponse({
  token,
  initialResponse,
  initialRespondedAt,
}: {
  token: string;
  initialResponse: "Accepted" | "Declined" | null;
  initialRespondedAt: string | null;
}) {
  const [response, setResponse] = useState(initialResponse);
  const [respondedAt, setRespondedAt] = useState(initialRespondedAt);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (response) {
    return (
      <div
        className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium ${
          response === "Accepted"
            ? "bg-green-50 text-green-700"
            : "bg-red-50 text-red-700"
        }`}
      >
        {response === "Accepted" ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
        {response === "Accepted" ? "You accepted this invoice" : "You declined this invoice"}
        {respondedAt ? <span className="text-xs font-normal opacity-75">· {formatDate(respondedAt)}</span> : null}
      </div>
    );
  }

  function respond(value: "Accepted" | "Declined") {
    setError(null);
    startTransition(async () => {
      const result = await respondToInvoice(token, value);
      if (result.ok) {
        setResponse(value);
        setRespondedAt(new Date().toISOString());
      } else {
        setError("Something went wrong -- please try again.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <button
          onClick={() => respond("Accepted")}
          disabled={pending}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
        >
          <Check className="h-4 w-4" /> Accept
        </button>
        <button
          onClick={() => respond("Declined")}
          disabled={pending}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"
        >
          <X className="h-4 w-4" /> Decline
        </button>
      </div>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
