"use client";

import { useState, useRef } from "react";
import { exportAllData, importData } from "@/lib/db";

export default function SettingsPage() {
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleExport() {
    try {
      const json = await exportAllData();
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `rxusa-legal-helper-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setStatus({ type: "success", message: "Data exported successfully." });
    } catch {
      setStatus({ type: "error", message: "Failed to export data." });
    }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setStatus(null);

    try {
      const text = await file.text();
      const result = await importData(text);
      setStatus({ type: "success", message: `Imported ${result.imported} records successfully.` });
    } catch {
      setStatus({ type: "error", message: "Failed to import data. Make sure the file is a valid backup." });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted text-sm mt-1">Manage your data and preferences</p>
      </div>

      {status && (
        <div className={`mb-6 p-4 rounded-lg border text-sm ${
          status.type === "success"
            ? "bg-green-500/10 border-green-500/30 text-green-400"
            : "bg-red-500/10 border-red-500/30 text-red-400"
        }`}>
          {status.message}
        </div>
      )}

      {/* Export Section */}
      <div className="bg-surface border border-border rounded-xl p-6 mb-6">
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4">Export Data</h2>
        <p className="text-sm text-muted mb-4">
          Download a complete backup of all your cases, templates, transcripts, exhibits, charges, witnesses, and activity logs as a JSON file.
        </p>
        <button
          onClick={handleExport}
          className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Export All Data
        </button>
      </div>

      {/* Import Section */}
      <div className="bg-surface border border-border rounded-xl p-6 mb-6">
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4">Import Data</h2>
        <p className="text-sm text-muted mb-4">
          Restore data from a previously exported backup file. Importing will merge with existing data &mdash; duplicate records (by ID) will be overwritten.
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImport}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={importing}
          className="border border-border hover:border-primary/50 text-foreground px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          {importing ? "Importing..." : "Import from File"}
        </button>
      </div>

      {/* About Section */}
      <div className="bg-surface border border-border rounded-xl p-6">
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4">About</h2>
        <div className="space-y-2 text-sm text-muted">
          <p><span className="text-foreground font-medium">RXUSA Legal Helper</span> &mdash; Case Management & Document Automation</p>
          <p>Built for the RXUSA (Roblox) US Legal System simulation.</p>
          <p>All data is stored locally in your browser using IndexedDB. No data is sent to any server.</p>
        </div>
      </div>
    </div>
  );
}
