"use client";

import { useEffect, useState } from "react";
import { Tag } from "lucide-react";
import { toast } from "sonner";

type OffCoupon = {
  code: string;
  pct: number;
  min: number;
  label: string;
  status?: string;
};

/** Active coupon chips — home strip + cart drawer dono jagah. Click = copy code. */
export function AvailableOffers({
  compact = false,
  className = "",
}: {
  compact?: boolean;
  className?: string;
}) {
  const [list, setList] = useState<OffCoupon[]>([]);

  useEffect(() => {
    fetch("/api/coupons", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        setList(((d.coupons ?? []) as OffCoupon[]).filter((c) => c.status === "active"));
      })
      .catch(() => {});
  }, []);

  if (list.length === 0) return null;

  return (
    <div className={className}>
      {!compact && (
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Available offers
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {list.map((c) => (
          <button
            key={c.code}
            title={c.label}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(c.code);
                toast.success(`${c.code} copied — apply it in your cart`);
              } catch {
                toast.info(`Use code ${c.code} at checkout`);
              }
            }}
            className="flex items-center gap-1.5 rounded-full border border-dashed border-gold bg-gold/10 px-3 py-1.5 text-[11px] font-medium text-cocoa transition hover:bg-gold/20 sm:text-xs"
          >
            <Tag className="h-3.5 w-3.5 shrink-0 text-gold" />
            <span className="font-mono font-bold">{c.code}</span>
            <span>
              {c.pct}% off{c.min > 0 ? ` above ₹${c.min.toLocaleString("en-IN")}` : ""}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
