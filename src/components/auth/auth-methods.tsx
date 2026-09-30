"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

type Method = "phone" | "email";

/** Switch between signing in with a mobile number or with email and password. */
export function AuthMethods({
  initial,
  phone,
  email,
}: {
  initial: Method;
  phone: React.ReactNode;
  email: React.ReactNode;
}) {
  const [method, setMethod] = useState<Method>(initial);
  const tabs: { id: Method; label: string }[] = [
    { id: "phone", label: "Mobile number" },
    { id: "email", label: "Email" },
  ];

  return (
    <div>
      <div role="tablist" aria-label="Sign-in method" className="mb-8 grid grid-cols-2 gap-1 rounded-full border p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`method-${tab.id}`}
            aria-selected={method === tab.id}
            aria-controls="method-panel"
            onClick={() => setMethod(tab.id)}
            className={cn(
              "rounded-full px-3 py-2 text-sm font-medium transition-colors duration-300",
              method === tab.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id="method-panel" aria-labelledby={`method-${method}`}>
        {method === "phone" ? phone : email}
      </div>
    </div>
  );
}
