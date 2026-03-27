"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import { getChargesForCase, saveCharge, deleteCharge } from "@/lib/db";
import type { Charge, OffenseClass } from "@/lib/types";
import { OFFENSE_CLASSES } from "@/lib/types";
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
const offences = allSections.filter(
  (s) => s.sectionNumber && s.chapter !== "Information"
);

function countToWord(n: number): string {
  const words = [
    "", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT",
    "NINE", "TEN", "ELEVEN", "TWELVE", "THIRTEEN", "FOURTEEN", "FIFTEEN",
    "SIXTEEN", "SEVENTEEN", "EIGHTEEN", "NINETEEN", "TWENTY",
  ];
  return n <= 20 ? words[n] : String(n);
}

interface ChargesManagerProps {
  caseId: string;
  onUpdate?: () => void;
}

export default function ChargesManager({ caseId, onUpdate }: ChargesManagerProps) {
  const [charges, setCharges] = useState<Charge[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingCharge, setEditingCharge] = useState<Charge | null>(null);
  const [chargeSearch, setChargeSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [form, setForm] = useState({
    chargeName: "",
    offenseClass: "Class A Felony" as OffenseClass,
    description: "",
  });
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getChargesForCase(caseId).then(setCharges);
  }, [caseId]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filteredOffences = useMemo(() => {
    if (!chargeSearch.trim()) return offences.slice(0, 50);
    const q = chargeSearch.toLowerCase();
    return offences.filter(
      (s) =>
        s.fullName.toLowerCase().includes(q) ||
        s.title.toLowerCase().includes(q) ||
        (s.sectionNumber && s.sectionNumber.includes(q)) ||
        s.chapter.toLowerCase().includes(q)
    );
  }, [chargeSearch]);

  function resetForm() {
    setForm({ chargeName: "", offenseClass: "Class A Felony", description: "" });
    setChargeSearch("");
    setShowDropdown(false);
    setEditingCharge(null);
    setShowForm(false);
  }

  function selectOffence(fullName: string) {
    setForm((prev) => ({ ...prev, chargeName: fullName }));
    setChargeSearch(fullName);
    setShowDropdown(false);
  }

  async function handleSave() {
    if (!form.chargeName.trim() || !form.description.trim()) return;

    const nextCount = editingCharge
      ? editingCharge.countNumber
      : charges.length + 1;

    const charge: Charge = {
      id: editingCharge?.id || uuidv4(),
      caseId,
      countNumber: nextCount,
      chargeName: form.chargeName.trim(),
      offenseClass: form.offenseClass,
      description: form.description.trim(),
      createdAt: editingCharge?.createdAt || new Date().toISOString(),
    };

    await saveCharge(charge);
    setCharges(await getChargesForCase(caseId));
    onUpdate?.();
    resetForm();
  }

  async function handleDelete(id: string) {
    await deleteCharge(id);
    // Re-fetch and renumber
    const remaining = await getChargesForCase(caseId);
    for (let i = 0; i < remaining.length; i++) {
      remaining[i].countNumber = i + 1;
      await saveCharge(remaining[i]);
    }
    setCharges(await getChargesForCase(caseId));
    onUpdate?.();
  }

  function handleEdit(charge: Charge) {
    setEditingCharge(charge);
    setForm({
      chargeName: charge.chargeName,
      offenseClass: charge.offenseClass,
      description: charge.description,
    });
    setChargeSearch(charge.chargeName);
    setShowForm(true);
  }

  const offenseClassColors: Record<string, string> = {
    "Class A Felony": "bg-red-500/15 text-red-400",
    "Class B Felony": "bg-orange-500/15 text-orange-400",
    "Class C Felony": "bg-amber-500/15 text-amber-400",
    "Class A Misdemeanor": "bg-yellow-500/15 text-yellow-400",
    "Class B Misdemeanor": "bg-lime-500/15 text-lime-400",
    "Class C Misdemeanor": "bg-green-500/15 text-green-400",
    Infraction: "bg-sky-500/15 text-sky-400",
    "Petty Offense": "bg-zinc-500/15 text-zinc-400",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">Charges</h2>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="text-xs bg-primary hover:bg-primary-hover text-white px-3 py-1.5 rounded-lg transition-colors"
        >
          + Add Charge
        </button>
      </div>

      {/* Add/Edit Charge Form */}
      {showForm && (
        <div className="bg-background border border-border rounded-lg p-4 mb-4 space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-semibold text-accent">
              COUNT {countToWord(editingCharge?.countNumber || charges.length + 1)}
            </span>
          </div>

          {/* Charge Selection from Criminal Code */}
          <div ref={dropdownRef} className="relative">
            <label className="block text-xs font-medium text-muted mb-1">
              Charge (from Criminal Code)
            </label>
            <input
              value={chargeSearch}
              onChange={(e) => {
                setChargeSearch(e.target.value);
                setForm((prev) => ({ ...prev, chargeName: e.target.value }));
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              placeholder="Search by section number, name, or keyword..."
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {showDropdown && (
              <div className="absolute z-50 mt-1 w-full bg-surface border border-border rounded-lg shadow-xl max-h-52 overflow-y-auto">
                {filteredOffences.length === 0 ? (
                  <p className="text-xs text-muted p-3 text-center">No matching offences.</p>
                ) : (
                  filteredOffences.map((s) => (
                    <button
                      key={`${s.part}-${s.sectionNumber}`}
                      type="button"
                      onClick={() => selectOffence(s.fullName)}
                      className={`w-full text-left px-3 py-2 text-sm border-b border-border/50 last:border-0 transition-colors ${
                        form.chargeName === s.fullName
                          ? "bg-primary/10 text-primary-hover"
                          : "text-foreground hover:bg-surface-hover"
                      }`}
                    >
                      <p className="font-medium">{s.fullName}</p>
                      <p className="text-xs text-muted">{s.part} &middot; {s.chapter}</p>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Offense Class */}
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Offense Class</label>
            <select
              value={form.offenseClass}
              onChange={(e) => setForm({ ...form, offenseClass: e.target.value as OffenseClass })}
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {OFFENSE_CLASSES.map((cls) => (
                <option key={cls} value={cls}>
                  {cls}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Charge Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Describe the alleged conduct constituting this charge..."
              rows={3}
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          <div className="flex gap-2 justify-end">
            <button
              onClick={resetForm}
              className="px-3 py-1.5 text-xs text-muted hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!form.chargeName.trim() || !form.description.trim()}
              className="text-xs bg-primary hover:bg-primary-hover disabled:opacity-50 text-white px-4 py-1.5 rounded-lg transition-colors"
            >
              {editingCharge ? "Save Changes" : "Add Charge"}
            </button>
          </div>
        </div>
      )}

      {/* Charges List */}
      {charges.length === 0 && !showForm ? (
        <div className="text-center py-8">
          <svg className="w-10 h-10 mx-auto text-border mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-muted text-xs">No charges filed. Click &quot;+ Add Charge&quot; to add counts to this case.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {charges.map((charge) => (
            <div
              key={charge.id}
              className="bg-background border border-border rounded-lg p-4 hover:border-primary/30 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-accent">
                      COUNT {countToWord(charge.countNumber)}
                    </span>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${offenseClassColors[charge.offenseClass] || "bg-zinc-500/15 text-zinc-400"}`}>
                      {charge.offenseClass}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-foreground mt-1">
                    {charge.chargeName}
                  </p>
                  <p className="text-sm text-muted mt-2">
                    {charge.description}
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0 ml-3">
                  <button
                    onClick={() => handleEdit(charge)}
                    className="text-xs text-muted hover:text-foreground transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(charge.id)}
                    className="text-xs text-danger hover:text-danger-hover transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export { countToWord };
