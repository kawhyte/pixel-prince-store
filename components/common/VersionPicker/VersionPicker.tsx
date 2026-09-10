"use client";

import Image from "next/image";

import { cn } from "@/lib/utils";
import { VERSION_LABEL } from "@/config/commerce";

export interface VersionOption {
  version: string;
  /** mockup of this version in the finish currently selected */
  imageUrl: string;
}

interface VersionPickerProps {
  options: VersionOption[];
  value: string | null;
  onChange: (version: string) => void;
}

/**
 * Versions of the artwork itself (PLAN-48): ivory background, midnight, and so on.
 * Each version is its own Fourthwall product, so the tile shows that product's mockup.
 * Renders nothing for a print that comes one way only.
 */
export default function VersionPicker({ options, value, onChange }: VersionPickerProps) {
  if (options.length < 2) return null;

  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold text-charcoal">
        {VERSION_LABEL}
        {value && <span className="font-normal text-muted-foreground"> · {value}</span>}
      </legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const active = o.version === value;
          return (
            <label
              key={o.version}
              title={o.version}
              className={cn(
                "cursor-pointer overflow-hidden rounded-md border bg-card transition-colors",
                active ? "border-charcoal ring-1 ring-charcoal" : "border-border hover:border-charcoal",
              )}
            >
              <input
                type="radio"
                name="version"
                value={o.version}
                checked={active}
                onChange={() => onChange(o.version)}
                className="sr-only"
              />
              <span className="relative block size-16 bg-muted">
                <Image src={o.imageUrl} alt={o.version} fill sizes="64px" className="object-contain" />
              </span>
              <span className="sr-only">{o.version}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
