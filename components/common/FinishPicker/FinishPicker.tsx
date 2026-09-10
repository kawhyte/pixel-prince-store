"use client";

import Image from "next/image";

import { getFinish, type FinishId } from "@/config/commerce";
import { formatPrice } from "@/lib/commerce";
import { cn } from "@/lib/utils";

export interface FinishOption {
  finish: FinishId;
  fromCents: number | null;
  mockupUrl?: string;
  /** fallback when the finish has no mockup yet */
  fallbackImage: string;
}

interface FinishPickerProps {
  options: FinishOption[];
  value: FinishId | null;
  onChange: (finish: FinishId) => void;
}

/**
 * Finish first, then size (PLAN-46): three picture tiles, one per finish on sale.
 * Renders nothing with a single finish so a print with only the poster looks like before.
 */
export default function FinishPicker({ options, value, onChange }: FinishPickerProps) {
  if (options.length < 2) return null;

  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold text-charcoal">Finish</legend>
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {options.map((o) => {
          const meta = getFinish(o.finish);
          const active = o.finish === value;
          return (
            <label
              key={o.finish}
              className={cn(
                "flex cursor-pointer flex-col overflow-hidden rounded-md border bg-card text-left transition-colors",
                active ? "border-charcoal ring-1 ring-charcoal" : "border-border hover:border-charcoal",
              )}
            >
              <input
                type="radio"
                name="finish"
                value={o.finish}
                checked={active}
                onChange={() => onChange(o.finish)}
                className="sr-only"
              />
              <span className="relative block aspect-[4/5] bg-muted">
                <Image
                  src={o.mockupUrl || o.fallbackImage}
                  alt={`${meta?.label ?? o.finish} finish`}
                  fill
                  sizes="(max-width: 640px) 30vw, 160px"
                  className="object-contain"
                />
              </span>
              <span className="flex flex-col gap-0.5 px-2.5 py-2">
                <span className="text-sm font-semibold text-charcoal">{meta?.label ?? o.finish}</span>
                <span className="hidden text-xs leading-snug text-soft-charcoal sm:block">{meta?.blurb}</span>
                {o.fromCents !== null && (
                  <span className="text-xs text-muted-foreground">from {formatPrice(o.fromCents)}</span>
                )}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
