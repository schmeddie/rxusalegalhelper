"use client";

import { useState, useMemo } from "react";
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

const sections: Section[] = criminalCodeData as Section[];

const ALL_PARTS = [...new Set(sections.map((s) => s.part))];
const ALL_CHAPTERS = [...new Set(sections.map((s) => s.chapter))];
const ALL_LABELS = [...new Set(sections.flatMap((s) => s.labels))].sort();

export default function CriminalCodePage() {
  const [search, setSearch] = useState("");
  const [selectedPart, setSelectedPart] = useState("");
  const [selectedChapter, setSelectedChapter] = useState("");
  const [selectedLabel, setSelectedLabel] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filter chapters based on selected part
  const availableChapters = useMemo(() => {
    if (!selectedPart) return ALL_CHAPTERS;
    return [...new Set(sections.filter((s) => s.part === selectedPart).map((s) => s.chapter))];
  }, [selectedPart]);

  const filtered = useMemo(() => {
    let result = sections;

    if (selectedPart) {
      result = result.filter((s) => s.part === selectedPart);
    }
    if (selectedChapter) {
      result = result.filter((s) => s.chapter === selectedChapter);
    }
    if (selectedLabel) {
      result = result.filter((s) => s.labels.includes(selectedLabel));
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.fullName.toLowerCase().includes(q) ||
          s.title.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          (s.sectionNumber && s.sectionNumber.includes(q))
      );
    }

    return result;
  }, [search, selectedPart, selectedChapter, selectedLabel]);

  function getUniqueKey(s: Section, i: number) {
    return `${s.part}-${s.sectionNumber || s.title}-${i}`;
  }

  function toggleExpand(key: string) {
    setExpandedId((prev) => (prev === key ? null : key));
  }

  function clearFilters() {
    setSearch("");
    setSelectedPart("");
    setSelectedChapter("");
    setSelectedLabel("");
  }

  const hasFilters = search || selectedPart || selectedChapter || selectedLabel;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Criminal Code</h1>
        <p className="text-muted text-sm mt-1">
          RXUSA Federal Criminal Code &mdash; {sections.length} sections across {ALL_PARTS.length} parts
        </p>
      </div>

      {/* Search & Filters */}
      <div className="bg-surface border border-border rounded-xl p-5 mb-6 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by section number, title, or keyword..."
            className="w-full bg-background border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Filter Row */}
        <div className="flex flex-wrap gap-3">
          <select
            value={selectedPart}
            onChange={(e) => {
              setSelectedPart(e.target.value);
              setSelectedChapter("");
            }}
            className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Parts</option>
            {ALL_PARTS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          <select
            value={selectedChapter}
            onChange={(e) => setSelectedChapter(e.target.value)}
            className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary min-w-0 max-w-xs"
          >
            <option value="">All Chapters</option>
            {availableChapters.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={selectedLabel}
            onChange={(e) => setSelectedLabel(e.target.value)}
            className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Tags</option>
            {ALL_LABELS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="text-sm text-muted hover:text-foreground transition-colors px-2"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Result count */}
        <p className="text-xs text-muted">
          Showing {filtered.length} of {sections.length} sections
        </p>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <svg
            className="w-12 h-12 mx-auto text-border mb-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <p className="text-muted text-sm">No sections match your search.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((s, i) => {
            const key = getUniqueKey(s, i);
            const isExpanded = expandedId === key;
            return (
              <div
                key={key}
                className={`bg-surface border rounded-xl transition-colors ${
                  isExpanded ? "border-primary/50" : "border-border hover:border-primary/30"
                }`}
              >
                {/* Header row - always visible */}
                <button
                  onClick={() => toggleExpand(key)}
                  className="w-full text-left p-4 flex items-start gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-foreground text-sm">
                        {s.fullName}
                      </h3>
                      {s.labels.map((l) => (
                        <LabelBadge key={l} label={l} />
                      ))}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-muted">{s.part}</span>
                      <span className="text-border text-xs">&middot;</span>
                      <span className="text-xs text-muted truncate">{s.chapter}</span>
                    </div>
                    {!isExpanded && s.description && (
                      <p className="text-xs text-muted mt-2 line-clamp-2">
                        {s.description.replace(/\*\*/g, "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").slice(0, 200)}
                        {s.description.length > 200 ? "..." : ""}
                      </p>
                    )}
                  </div>
                  <svg
                    className={`w-4 h-4 text-muted flex-shrink-0 mt-1 transition-transform ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {/* Expanded content */}
                {isExpanded && s.description && (
                  <div className="px-4 pb-4 border-t border-border pt-4">
                    <div className="prose-sm text-foreground text-sm leading-relaxed whitespace-pre-wrap">
                      <FormattedDescription text={s.description} />
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

function LabelBadge({ label }: { label: string }) {
  const colorMap: Record<string, string> = {
    "INGAME ARREST": "bg-green-500/15 text-green-400",
    "COURTS ONLY": "bg-zinc-500/15 text-zinc-400",
    Informational: "bg-purple-500/15 text-purple-400",
    NULLIFIED: "bg-red-500/15 text-red-400",
    FBI: "bg-blue-500/15 text-blue-400",
    FBOP: "bg-sky-500/15 text-sky-400",
    USMS: "bg-amber-500/15 text-amber-400",
    "Attorney General Authorization or Certification": "bg-orange-500/15 text-orange-400",
    "Significantly Effected by Court Order": "bg-orange-500/15 text-orange-400",
    Omitted: "bg-pink-500/15 text-pink-400",
    DSS: "bg-teal-500/15 text-teal-400",
    USSS: "bg-indigo-500/15 text-indigo-400",
  };
  const colors = colorMap[label] || "bg-zinc-500/15 text-zinc-400";

  return (
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${colors}`}>
      {label}
    </span>
  );
}

function FormattedDescription({ text }: { text: string }) {
  // Convert markdown-style bold and links to readable text
  const formatted = text
    // Convert markdown links [text](url) to just text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    // Convert **bold** to styled spans
    .split(/(\*\*[^*]+\*\*)/)
    .map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={i} className="font-semibold text-accent">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return <span key={i}>{part}</span>;
    });

  return <>{formatted}</>;
}
