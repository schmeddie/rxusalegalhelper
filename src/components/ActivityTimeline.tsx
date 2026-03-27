"use client";

import { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { getActivityForCase, saveActivity, deleteActivity } from "@/lib/db";
import type { ActivityEntry } from "@/lib/types";

interface ActivityTimelineProps {
  caseId: string;
}

export default function ActivityTimeline({ caseId }: ActivityTimelineProps) {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ action: "", detail: "" });

  useEffect(() => {
    getActivityForCase(caseId).then(setEntries);
  }, [caseId]);

  function resetForm() {
    setForm({ action: "", detail: "" });
    setShowForm(false);
  }

  async function handleSave() {
    if (!form.action.trim()) return;
    const entry: ActivityEntry = {
      id: uuidv4(),
      caseId,
      type: "manual",
      action: form.action.trim(),
      detail: form.detail.trim(),
      createdAt: new Date().toISOString(),
    };
    await saveActivity(entry);
    setEntries(await getActivityForCase(caseId));
    resetForm();
  }

  async function handleDelete(id: string) {
    await deleteActivity(id);
    setEntries(await getActivityForCase(caseId));
  }

  function formatDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  const autoIcons: Record<string, string> = {
    "Charge Added": "M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z",
    "Charge Removed": "M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z",
    "Exhibit Added": "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z",
    "Exhibit Removed": "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16",
    "Witness Added": "M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z",
    "Witness Removed": "M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6",
    "Status Changed": "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
    "Document Generated": "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
    "Transcript Uploaded": "M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z",
  };

  const defaultIcon = "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z";

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">Activity Log</h2>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="text-xs bg-primary hover:bg-primary-hover text-white px-3 py-1.5 rounded-lg transition-colors"
        >
          + Add Note
        </button>
      </div>

      {showForm && (
        <div className="bg-background border border-border rounded-lg p-4 mb-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Action</label>
            <input
              value={form.action}
              onChange={(e) => setForm({ ...form, action: e.target.value })}
              placeholder="e.g. Filed Motion to Suppress, Client Meeting"
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Details (optional)</label>
            <textarea
              value={form.detail}
              onChange={(e) => setForm({ ...form, detail: e.target.value })}
              placeholder="Additional details..."
              rows={2}
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
              disabled={!form.action.trim()}
              className="text-xs bg-primary hover:bg-primary-hover disabled:opacity-50 text-white px-4 py-1.5 rounded-lg transition-colors"
            >
              Add Entry
            </button>
          </div>
        </div>
      )}

      {entries.length === 0 && !showForm ? (
        <div className="text-center py-8">
          <svg className="w-10 h-10 mx-auto text-border mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-muted text-xs">No activity recorded yet. Actions will be logged automatically as you work on this case.</p>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

          <div className="space-y-4">
            {entries.map((entry) => {
              const icon = autoIcons[entry.action] || defaultIcon;
              return (
                <div key={entry.id} className="relative flex gap-4 pl-1">
                  {/* Timeline dot */}
                  <div className={`relative z-10 flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
                    entry.type === "auto"
                      ? "bg-surface border border-border"
                      : "bg-primary/15 border border-primary/30"
                  }`}>
                    <svg className={`w-3.5 h-3.5 ${entry.type === "auto" ? "text-muted" : "text-primary-hover"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
                    </svg>
                  </div>

                  <div className="flex-1 min-w-0 pb-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${
                        entry.type === "auto" ? "text-muted" : "text-foreground"
                      }`}>
                        {entry.action}
                      </span>
                      {entry.type === "manual" && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary-hover">
                          manual
                        </span>
                      )}
                    </div>
                    {entry.detail && (
                      <p className="text-xs text-muted mt-0.5">{entry.detail}</p>
                    )}
                    <p className="text-[10px] text-muted mt-1">{formatDate(entry.createdAt)}</p>
                  </div>

                  {entry.type === "manual" && (
                    <button
                      onClick={() => handleDelete(entry.id)}
                      className="flex-shrink-0 text-xs text-danger hover:text-danger-hover transition-colors self-start mt-0.5"
                    >
                      Remove
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
