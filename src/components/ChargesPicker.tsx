"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import criminalCodeData from "@/lib/criminal-code.json";

interface Section {
  part: string;
  chapter: string;
  sectionNumber: string | null;
  title: string;
  fullName: string;
  description: string;
  labels: string[];
}

const allSections: Section[] = criminalCodeData as Section[];
// Only sections with actual section numbers are chargeable offences
const offences = allSections.filter(
  (s) => s.sectionNumber && s.chapter !== "Information"
);

interface ChargesPickerProps {
  value: string;
  onChange: (value: string) => void;
}

export default function ChargesPicker({ value, onChange }: ChargesPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Parse selected charges from semicolon-separated string
  const selected = useMemo(() => {
    if (!value.trim()) return [] as string[];
    return value.split(";").map((s) => s.trim()).filter(Boolean);
  }, [value]);

  const filtered = useMemo(() => {
    if (!search.trim()) return offences;
    const q = search.toLowerCase();
    return offences.filter(
      (s) =>
        s.fullName.toLowerCase().includes(q) ||
        s.title.toLowerCase().includes(q) ||
        (s.sectionNumber && s.sectionNumber.includes(q)) ||
        s.chapter.toLowerCase().includes(q)
    );
  }, [search]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Focus search when opened
  useEffect(() => {
    if (open && searchRef.current) {
      searchRef.current.focus();
    }
  }, [open]);

  function toggleCharge(fullName: string) {
    let next: string[];
    if (selected.includes(fullName)) {
      next = selected.filter((s) => s !== fullName);
    } else {
      next = [...selected, fullName];
    }
    onChange(next.join("; "));
  }

  function removeCharge(fullName: string) {
    const next = selected.filter((s) => s !== fullName);
    onChange(next.join("; "));
  }

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-sm font-medium text-muted mb-1">Charges</label>

      {/* Selected charges display / trigger */}
      <div
        onClick={() => setOpen(!open)}
        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground cursor-pointer min-h-[38px] focus-within:ring-2 focus-within:ring-primary"
      >
        {selected.length === 0 ? (
          <span className="text-muted">Click to select charges from the criminal code...</span>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {selected.map((charge) => (
              <span
                key={charge}
                className="inline-flex items-center gap-1 bg-primary/15 text-primary-hover text-xs px-2 py-1 rounded-md"
              >
                <span className="truncate max-w-[200px]">{charge}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeCharge(charge);
                  }}
                  className="text-primary-hover hover:text-foreground ml-0.5"
                >
                  &times;
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-surface border border-border rounded-lg shadow-xl max-h-72 flex flex-col">
          {/* Search */}
          <div className="p-2 border-b border-border">
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search offences by name, section, or chapter..."
              className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Results */}
          <div className="overflow-y-auto flex-1">
            {filtered.length === 0 ? (
              <p className="text-xs text-muted p-3 text-center">No matching offences found.</p>
            ) : (
              filtered.map((s) => {
                const isSelected = selected.includes(s.fullName);
                return (
                  <button
                    key={`${s.part}-${s.sectionNumber}`}
                    type="button"
                    onClick={() => toggleCharge(s.fullName)}
                    className={`w-full text-left px-3 py-2 text-sm border-b border-border/50 last:border-0 transition-colors ${
                      isSelected
                        ? "bg-primary/10 text-primary-hover"
                        : "text-foreground hover:bg-surface-hover"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-4 h-4 flex-shrink-0 rounded border flex items-center justify-center text-xs ${
                        isSelected ? "bg-primary border-primary text-white" : "border-border"
                      }`}>
                        {isSelected && "✓"}
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{s.fullName}</p>
                        <p className="text-xs text-muted truncate">
                          {s.part} &middot; {s.chapter}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-2 border-t border-border flex items-center justify-between">
            <span className="text-xs text-muted">
              {selected.length} charge{selected.length !== 1 ? "s" : ""} selected
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs text-primary hover:text-primary-hover font-medium"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
