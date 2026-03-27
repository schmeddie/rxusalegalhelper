"use client";

import { useState, useMemo } from "react";
import rulesData from "@/lib/rules-data.json";

interface Rule {
  ruleNumber: string;
  title: string;
  fullName: string;
  titleGroup: string;
  body: string;
  reserved: boolean;
}

const rules: Rule[] = rulesData as Rule[];
const TITLE_GROUPS = [...new Set(rules.map((r) => r.titleGroup))];

export default function RulesPage() {
  const [search, setSearch] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [hideReserved, setHideReserved] = useState(true);

  const filtered = useMemo(() => {
    let result = rules;

    if (hideReserved) {
      result = result.filter((r) => !r.reserved);
    }
    if (selectedGroup) {
      result = result.filter((r) => r.titleGroup === selectedGroup);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.fullName.toLowerCase().includes(q) ||
          r.title.toLowerCase().includes(q) ||
          r.body.toLowerCase().includes(q) ||
          r.ruleNumber.includes(q)
      );
    }
    return result;
  }, [search, selectedGroup, hideReserved]);

  const hasFilters = search || selectedGroup || !hideReserved;

  function clearFilters() {
    setSearch("");
    setSelectedGroup("");
    setHideReserved(true);
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Federal Rules of Criminal Procedure</h1>
        <p className="text-muted text-sm mt-1">
          As amended to December 1, 2024 &mdash; {rules.filter((r) => !r.reserved).length} active rules
        </p>
      </div>

      {/* Search & Filters */}
      <div className="bg-surface border border-border rounded-xl p-5 mb-6 space-y-4">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by rule number, title, or keyword..."
            className="w-full bg-background border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Titles</option>
            {TITLE_GROUPS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>

          <label className="flex items-center gap-2 text-sm text-muted cursor-pointer">
            <input
              type="checkbox"
              checked={hideReserved}
              onChange={(e) => setHideReserved(e.target.checked)}
              className="rounded border-border accent-primary"
            />
            Hide reserved/transferred
          </label>

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="text-sm text-muted hover:text-foreground transition-colors px-2"
            >
              Clear filters
            </button>
          )}
        </div>

        <p className="text-xs text-muted">
          Showing {filtered.length} of {rules.length} rules
        </p>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <svg className="w-12 h-12 mx-auto text-border mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p className="text-muted text-sm">No rules match your search.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => {
            const isExpanded = expandedId === r.ruleNumber;
            return (
              <div
                key={r.ruleNumber}
                className={`bg-surface border rounded-xl transition-colors ${
                  isExpanded ? "border-primary/50" : "border-border hover:border-primary/30"
                }`}
              >
                <button
                  onClick={() => setExpandedId(isExpanded ? null : r.ruleNumber)}
                  className="w-full text-left p-4 flex items-start gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-foreground text-sm">
                        {r.fullName}
                      </h3>
                      {r.reserved && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-zinc-500/15 text-zinc-400">
                          {r.title.includes("Transferred") ? "Transferred" : "Reserved"}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted">{r.titleGroup}</span>
                    {!isExpanded && r.body && !r.reserved && (
                      <p className="text-xs text-muted mt-2 line-clamp-2">
                        {r.body.slice(0, 200)}{r.body.length > 200 ? "..." : ""}
                      </p>
                    )}
                  </div>
                  {!r.reserved && (
                    <svg
                      className={`w-4 h-4 text-muted flex-shrink-0 mt-1 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                </button>

                {isExpanded && r.body && (
                  <div className="px-4 pb-4 border-t border-border pt-4">
                    <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap font-mono text-xs">
                      {r.body}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
