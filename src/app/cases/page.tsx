"use client";

import { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { getAllCases, saveCase, deleteCase } from "@/lib/db";
import type { Case } from "@/lib/types";
import Link from "next/link";

export default function CasesPage() {
  const [cases, setCases] = useState<Case[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingCase, setEditingCase] = useState<Case | null>(null);
  const [form, setForm] = useState({
    caseName: "",
    caseNumber: "",
    assignedJudge: "",
    charges: "",
    defendantName: "",
  });

  useEffect(() => {
    getAllCases().then(setCases);
  }, []);

  function resetForm() {
    setForm({ caseName: "", caseNumber: "", assignedJudge: "", charges: "", defendantName: "" });
    setEditingCase(null);
    setShowForm(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const now = new Date().toISOString();
    const c: Case = editingCase
      ? { ...editingCase, ...form, updatedAt: now }
      : { id: uuidv4(), ...form, createdAt: now, updatedAt: now };
    await saveCase(c);
    setCases(await getAllCases());
    resetForm();
  }

  function handleEdit(c: Case) {
    setForm({
      caseName: c.caseName,
      caseNumber: c.caseNumber,
      assignedJudge: c.assignedJudge,
      charges: c.charges,
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
      <div className="flex items-center justify-between mb-8">
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
              <div>
                <label className="block text-sm font-medium text-muted mb-1">Charges</label>
                <textarea
                  required
                  value={form.charges}
                  onChange={(e) => setForm({ ...form, charges: e.target.value })}
                  placeholder="e.g. Wire Fraud (18 U.S.C. § 1343)"
                  rows={3}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>
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
          {cases.map((c) => (
            <div key={c.id} className="bg-surface border border-border rounded-xl p-5 hover:border-primary/50 transition-colors group">
              <Link href={`/cases/${c.id}`} className="block mb-3">
                <h3 className="font-semibold text-foreground group-hover:text-primary-hover transition-colors">
                  {c.caseName}
                </h3>
                <p className="text-xs text-muted mt-1">#{c.caseNumber}</p>
              </Link>
              <div className="space-y-1 text-sm text-muted mb-4">
                <p>Judge: {c.assignedJudge}</p>
                <p>Defendant: {c.defendantName}</p>
                <p className="truncate">Charges: {c.charges}</p>
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
