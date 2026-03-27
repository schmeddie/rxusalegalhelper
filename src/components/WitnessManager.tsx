"use client";

import { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { getWitnessesForCase, saveWitness, deleteWitness } from "@/lib/db";
import type { Witness } from "@/lib/types";

interface WitnessManagerProps {
  caseId: string;
  onUpdate?: () => void;
}

export default function WitnessManager({ caseId, onUpdate }: WitnessManagerProps) {
  const [witnesses, setWitnesses] = useState<Witness[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingWitness, setEditingWitness] = useState<Witness | null>(null);
  const [form, setForm] = useState({
    name: "",
    affiliation: "",
    expectedTestimony: "",
  });

  useEffect(() => {
    getWitnessesForCase(caseId).then(setWitnesses);
  }, [caseId]);

  function resetForm() {
    setForm({ name: "", affiliation: "", expectedTestimony: "" });
    setEditingWitness(null);
    setShowForm(false);
  }

  async function handleSave() {
    if (!form.name.trim()) return;

    const nextNumber = editingWitness
      ? editingWitness.witnessNumber
      : witnesses.length + 1;

    const witness: Witness = {
      id: editingWitness?.id || uuidv4(),
      caseId,
      witnessNumber: nextNumber,
      name: form.name.trim(),
      affiliation: form.affiliation.trim(),
      expectedTestimony: form.expectedTestimony.trim(),
      createdAt: editingWitness?.createdAt || new Date().toISOString(),
    };

    await saveWitness(witness);
    setWitnesses(await getWitnessesForCase(caseId));
    onUpdate?.();
    resetForm();
  }

  async function handleDelete(id: string) {
    await deleteWitness(id);
    const remaining = await getWitnessesForCase(caseId);
    for (let i = 0; i < remaining.length; i++) {
      remaining[i].witnessNumber = i + 1;
      await saveWitness(remaining[i]);
    }
    setWitnesses(await getWitnessesForCase(caseId));
    onUpdate?.();
  }

  function handleEdit(witness: Witness) {
    setEditingWitness(witness);
    setForm({
      name: witness.name,
      affiliation: witness.affiliation,
      expectedTestimony: witness.expectedTestimony,
    });
    setShowForm(true);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">Witnesses</h2>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="text-xs bg-primary hover:bg-primary-hover text-white px-3 py-1.5 rounded-lg transition-colors"
        >
          + Add Witness
        </button>
      </div>

      {showForm && (
        <div className="bg-background border border-border rounded-lg p-4 mb-4 space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-semibold text-accent">
              Witness #{editingWitness?.witnessNumber || witnesses.length + 1}
            </span>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted mb-1">Full Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. John Smith"
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted mb-1">Affiliation</label>
            <input
              value={form.affiliation}
              onChange={(e) => setForm({ ...form, affiliation: e.target.value })}
              placeholder="e.g. Prosecution, Defense, Law Enforcement, Civilian"
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted mb-1">Expected Testimony</label>
            <textarea
              value={form.expectedTestimony}
              onChange={(e) => setForm({ ...form, expectedTestimony: e.target.value })}
              placeholder="Summarize what this witness is expected to testify about..."
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
              disabled={!form.name.trim()}
              className="text-xs bg-primary hover:bg-primary-hover disabled:opacity-50 text-white px-4 py-1.5 rounded-lg transition-colors"
            >
              {editingWitness ? "Save Changes" : "Add Witness"}
            </button>
          </div>
        </div>
      )}

      {witnesses.length === 0 && !showForm ? (
        <div className="text-center py-8">
          <svg className="w-10 h-10 mx-auto text-border mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <p className="text-muted text-xs">No witnesses listed. Click &quot;+ Add Witness&quot; to add witnesses to this case.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {witnesses.map((witness) => (
            <div
              key={witness.id}
              className="bg-background border border-border rounded-lg p-4 hover:border-primary/30 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-accent">
                      WITNESS #{witness.witnessNumber}
                    </span>
                    <span className="text-sm font-medium text-foreground">
                      &mdash; {witness.name}
                    </span>
                    {witness.affiliation && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/15 text-purple-400">
                        {witness.affiliation}
                      </span>
                    )}
                  </div>
                  {witness.expectedTestimony && (
                    <p className="text-sm text-foreground mt-2">
                      <span className="text-muted">Expected Testimony:</span> {witness.expectedTestimony}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 flex-shrink-0 ml-3">
                  <button
                    onClick={() => handleEdit(witness)}
                    className="text-xs text-muted hover:text-foreground transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(witness.id)}
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
