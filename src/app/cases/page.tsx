"use client";

import { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { getAllCases, saveCase, deleteCase } from "@/lib/db";
import type { Case, CaseStatus } from "@/lib/types";
import { CASE_STATUSES, CASE_STATUS_COLORS } from "@/lib/types";
import Link from "next/link";

export default function CasesPage() {
  const [cases, setCases] = useState<Case[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingCase, setEditingCase] = useState<Case | null>(null);
  const [statusFilter, setStatusFilter] = useState<CaseStatus | "all">("all");
  const [form, setForm] = useState({
    caseName: "",
    caseNumber: "",
    assignedJudge: "",
    defendantName: "",
  });

  useEffect(() => {
    getAllCases().then(setCases);
  }, []);

  function resetForm() {
    setForm({ caseName: "", caseNumber: "", assignedJudge: "", defendantName: "" });
    setEditingCase(null);
    setShowForm(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const now = new Date().toISOString();
    const c: Case = editingCase
      ? { ...editingCase, ...form, updatedAt: now }
      : { id: uuidv4(), ...form, charges: "", status: "Pre-Filing" as CaseStatus, createdAt: now, updatedAt: now };
    await saveCase(c);
    setCases(await getAllCases());
    resetForm();
  }

  function handleEdit(c: Case) {
    setForm({
      caseName: c.caseName,
      caseNumber: c.caseNumber,
      assignedJudge: c.assignedJudge,
      defendantName: c.defendantName,
    });
    setEditingCase(c);
    setShowForm(true);
  }

  async function handleDelete(id: string) {
    await deleteCase(id);
    setCases(await getAllCases());
  }

  return (
    <div>
      {/* Dashboard Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total Cases", value: cases.length, color: "text-foreground" },
          { label: "Active", value: cases.filter(c => !["Closed", "Dismissed"].includes(c.status)).length, color: "text-blue-400" },
          { label: "In Trial", value: cases.filter(c => c.status === "Trial").length, color: "text-amber-400" },
          { label: "Closed", value: cases.filter(c => c.status === "Closed" || c.status === "Dismissed").length, color: "text-green-400" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-surface border border-border rounded-lg p-3 text-center">
            <p className={`text-xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-muted mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Active Cases</h1>
          <p className="text-muted text-sm mt-1">Manage your case docket</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + New Case
        </button>
      </div>

      {/* Status Filter */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setStatusFilter("all")}
          className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
            statusFilter === "all"
              ? "bg-primary/15 border-primary/50 text-primary-hover"
              : "border-border text-muted hover:text-foreground"
          }`}
        >
          All ({cases.length})
        </button>
        {CASE_STATUSES.map((status) => {
          const count = cases.filter(c => c.status === status).length;
          if (count === 0) return null;
          return (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                statusFilter === status
                  ? "bg-primary/15 border-primary/50 text-primary-hover"
                  : "border-border text-muted hover:text-foreground"
              }`}
            >
              {status} ({count})
            </button>
          );
        })}
      </div>

      {/* Create/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface border border-border rounded-xl p-6 w-full max-w-lg">
            <h2 className="text-lg font-semibold mb-4">
              {editingCase ? "Edit Case" : "Create New Case"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {[
                { key: "caseName", label: "Case Name", placeholder: "e.g. US v. Doe" },
                { key: "caseNumber", label: "Case Number", placeholder: "e.g. 2026-CR-001" },
                { key: "assignedJudge", label: "Assigned Judge", placeholder: "e.g. Hon. Smith" },
                { key: "defendantName", label: "Defendant Name", placeholder: "e.g. John Doe" },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-muted mb-1">{label}</label>
                  <input
                    required
                    value={form[key as keyof typeof form]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    placeholder={placeholder}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              ))}
              <p className="text-xs text-muted">Charges are managed on the case detail page after creation.</p>
              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-sm text-muted hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  {editingCase ? "Save Changes" : "Create Case"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cases Grid */}
      {cases.length === 0 ? (
        <div className="text-center py-20">
          <svg className="w-16 h-16 mx-auto text-border mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-muted text-sm">No active cases. Click &quot;+ New Case&quot; to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cases
            .filter(c => statusFilter === "all" || c.status === statusFilter)
            .map((c) => (
            <div key={c.id} className="bg-surface border border-border rounded-xl p-5 hover:border-primary/50 transition-colors group">
              <Link href={`/cases/${c.id}`} className="block mb-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground group-hover:text-primary-hover transition-colors">
                    {c.caseName}
                  </h3>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${CASE_STATUS_COLORS[c.status] || "bg-zinc-500/15 text-zinc-400"}`}>
                    {c.status}
                  </span>
                </div>
                <p className="text-xs text-muted mt-1">#{c.caseNumber}</p>
              </Link>
              <div className="space-y-1 text-sm text-muted mb-4">
                <p>Judge: {c.assignedJudge}</p>
                <p>Defendant: {c.defendantName}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(c)}
                  className="text-xs text-muted hover:text-foreground transition-colors"
                >
                  Edit
                </button>
                <span className="text-border">|</span>
                <button
                  onClick={() => handleDelete(c.id)}
                  className="text-xs text-danger hover:text-danger-hover transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
