"use client";

import { useState, useEffect, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import { getExhibitsForCase, saveExhibit, deleteExhibit } from "@/lib/db";
import type { Exhibit, ExhibitMediaType } from "@/lib/types";

function numberToLetter(n: number): string {
  // 1 -> A, 2 -> B, ... 26 -> Z, 27 -> AA, etc.
  let result = "";
  let num = n;
  while (num > 0) {
    num--;
    result = String.fromCharCode(65 + (num % 26)) + result;
    num = Math.floor(num / 26);
  }
  return result;
}

interface EvidenceManagerProps {
  caseId: string;
  onUpdate?: () => void;
}

export default function EvidenceManager({ caseId, onUpdate }: EvidenceManagerProps) {
  const [exhibits, setExhibits] = useState<Exhibit[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingExhibit, setEditingExhibit] = useState<Exhibit | null>(null);
  const [form, setForm] = useState({
    name: "",
    mediaType: "link" as ExhibitMediaType,
    source: "",
    description: "",
    imageData: "",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getExhibitsForCase(caseId).then(setExhibits);
  }, [caseId]);

  function resetForm() {
    setForm({ name: "", mediaType: "link", source: "", description: "", imageData: "" });
    setEditingExhibit(null);
    setShowForm(false);
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({ ...prev, imageData: reader.result as string, source: file.name }));
    };
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    if (!form.name.trim() || !form.description.trim()) return;

    const nextNumber = editingExhibit
      ? editingExhibit.exhibitNumber
      : exhibits.length + 1;

    const exhibit: Exhibit = {
      id: editingExhibit?.id || uuidv4(),
      caseId,
      exhibitNumber: nextNumber,
      exhibitLetter: numberToLetter(nextNumber),
      name: form.name.trim(),
      mediaType: form.mediaType,
      source: form.source.trim(),
      description: form.description.trim(),
      imageData: form.mediaType === "image" ? form.imageData : undefined,
      createdAt: editingExhibit?.createdAt || new Date().toISOString(),
    };

    await saveExhibit(exhibit);
    setExhibits(await getExhibitsForCase(caseId));
    onUpdate?.();
    resetForm();
  }

  async function handleDelete(id: string) {
    await deleteExhibit(id);
    // Re-fetch and renumber
    const remaining = await getExhibitsForCase(caseId);
    for (let i = 0; i < remaining.length; i++) {
      remaining[i].exhibitNumber = i + 1;
      remaining[i].exhibitLetter = numberToLetter(i + 1);
      await saveExhibit(remaining[i]);
    }
    setExhibits(await getExhibitsForCase(caseId));
    onUpdate?.();
  }

  function handleEdit(exhibit: Exhibit) {
    setEditingExhibit(exhibit);
    setForm({
      name: exhibit.name,
      mediaType: exhibit.mediaType,
      source: exhibit.source,
      description: exhibit.description,
      imageData: exhibit.imageData || "",
    });
    setShowForm(true);
  }

  const mediaTypeLabels: Record<ExhibitMediaType, string> = {
    image: "Image",
    link: "Link/Document",
    other: "Other",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">Evidence</h2>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="text-xs bg-primary hover:bg-primary-hover text-white px-3 py-1.5 rounded-lg transition-colors"
        >
          + Add Exhibit
        </button>
      </div>

      {/* Add/Edit Exhibit Form */}
      {showForm && (
        <div className="bg-background border border-border rounded-lg p-4 mb-4 space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-semibold text-accent">
              Exhibit {numberToLetter(editingExhibit?.exhibitNumber || exhibits.length + 1)}
            </span>
            <span className="text-xs text-muted">
              (#{editingExhibit?.exhibitNumber || exhibits.length + 1})
            </span>
          </div>

          {/* Exhibit Name */}
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Exhibit Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Video Recording, Supporting Affidavit, Witness Statement"
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Media Type */}
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Media Type</label>
            <div className="flex gap-2">
              {(["image", "link", "other"] as ExhibitMediaType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setForm({ ...form, mediaType: type, source: type !== form.mediaType ? "" : form.source, imageData: "" })}
                  className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                    form.mediaType === type
                      ? "bg-primary/15 border-primary/50 text-primary-hover"
                      : "border-border text-muted hover:text-foreground"
                  }`}
                >
                  {mediaTypeLabels[type]}
                </button>
              ))}
            </div>
          </div>

          {/* Source input based on media type */}
          <div>
            <label className="block text-xs font-medium text-muted mb-1">
              {form.mediaType === "image" ? "Upload Image" : form.mediaType === "link" ? "Link/URL" : "Source Description"}
            </label>
            {form.mediaType === "image" ? (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full bg-surface border border-border border-dashed rounded-lg px-3 py-4 text-sm text-muted hover:text-foreground hover:border-primary/50 transition-colors"
                >
                  {form.imageData ? "Image uploaded - Click to change" : "Click to upload image"}
                </button>
                {form.imageData && (
                  <p className="text-xs text-muted mt-1">{form.source}</p>
                )}
              </div>
            ) : (
              <input
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value })}
                placeholder={
                  form.mediaType === "link"
                    ? "e.g. https://drive.google.com/..."
                    : "e.g. Physical evidence collected at scene"
                }
                className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary"
              />
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Describe what this evidence shows..."
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
              disabled={!form.name.trim() || !form.description.trim()}
              className="text-xs bg-primary hover:bg-primary-hover disabled:opacity-50 text-white px-4 py-1.5 rounded-lg transition-colors"
            >
              {editingExhibit ? "Save Changes" : "Add Exhibit"}
            </button>
          </div>
        </div>
      )}

      {/* Exhibits List */}
      {exhibits.length === 0 && !showForm ? (
        <div className="text-center py-8">
          <svg className="w-10 h-10 mx-auto text-border mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <p className="text-muted text-xs">No exhibits added. Click &quot;+ Add Exhibit&quot; to start building your evidence list.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {exhibits.map((exhibit) => (
            <div
              key={exhibit.id}
              className="bg-background border border-border rounded-lg p-4 hover:border-primary/30 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-accent">
                      EXHIBIT {exhibit.exhibitNumber}
                    </span>
                    <span className="text-sm text-foreground">
                      &mdash; Exhibit {exhibit.exhibitLetter} ({exhibit.name})
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      exhibit.mediaType === "image"
                        ? "bg-blue-500/15 text-blue-400"
                        : exhibit.mediaType === "link"
                          ? "bg-green-500/15 text-green-400"
                          : "bg-zinc-500/15 text-zinc-400"
                    }`}>
                      {mediaTypeLabels[exhibit.mediaType]}
                    </span>
                  </div>
                  <p className="text-sm text-foreground mt-2">
                    <span className="text-muted">Description:</span> {exhibit.description}
                  </p>
                  {exhibit.source && (
                    <p className="text-sm text-foreground mt-1">
                      <span className="text-muted">
                        {exhibit.mediaType === "link" ? "Link/document filed:" : "Source:"}
                      </span>{" "}
                      {exhibit.mediaType === "link" ? (
                        <span className="text-primary-hover break-all">{exhibit.source}</span>
                      ) : (
                        exhibit.source
                      )}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 flex-shrink-0 ml-3">
                  <button
                    onClick={() => handleEdit(exhibit)}
                    className="text-xs text-muted hover:text-foreground transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(exhibit.id)}
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
