"use client";

import { useEffect, useState, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import { getAllTemplates, saveTemplate, deleteTemplate } from "@/lib/db";
import { extractPlaceholders } from "@/lib/docx";
import type { Template, PlaceholderMapping, CaseVariable } from "@/lib/types";
import { CASE_VARIABLE_LABELS } from "@/lib/types";

type UploadStep = "idle" | "uploaded" | "mapping";

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [step, setStep] = useState<UploadStep>("idle");
  const [templateName, setTemplateName] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileData, setFileData] = useState<ArrayBuffer | null>(null);
  const [placeholders, setPlaceholders] = useState<string[]>([]);
  const [mappings, setMappings] = useState<PlaceholderMapping[]>([]);
  const [error, setError] = useState("");
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getAllTemplates().then(setTemplates);
  }, []);

  function resetUpload() {
    setStep("idle");
    setTemplateName("");
    setFileName("");
    setFileData(null);
    setPlaceholders([]);
    setMappings([]);
    setError("");
    setEditingTemplate(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".docx")) {
      setError("Please upload a .docx file");
      return;
    }

    setError("");
    setFileName(file.name);
    if (!templateName) {
      setTemplateName(file.name.replace(/\.docx$/, ""));
    }

    const reader = new FileReader();
    reader.onload = () => {
      const data = reader.result as ArrayBuffer;
      setFileData(data);

      try {
        const found = extractPlaceholders(data);
        setPlaceholders(found);
        setMappings(
          found.map((p) => ({ placeholder: p, variable: "" as CaseVariable }))
        );
        setStep("uploaded");
      } catch {
        setError("Failed to parse .docx file. Make sure it is a valid Word document.");
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function updateMapping(index: number, variable: CaseVariable | "") {
    setMappings((prev) =>
      prev.map((m, i) =>
        i === index ? { ...m, variable: variable as CaseVariable } : m
      )
    );
  }

  async function handleSave() {
    if (!fileData || !templateName.trim()) return;

    const activeMappings = mappings.filter((m) => m.variable);
    const template: Template = editingTemplate
      ? {
          ...editingTemplate,
          name: templateName,
          fileName,
          fileData,
          placeholders,
          mappings: activeMappings,
        }
      : {
          id: uuidv4(),
          name: templateName,
          fileName,
          fileData,
          placeholders,
          mappings: activeMappings,
          createdAt: new Date().toISOString(),
        };

    await saveTemplate(template);
    setTemplates(await getAllTemplates());
    resetUpload();
  }

  function handleEditTemplate(t: Template) {
    setEditingTemplate(t);
    setTemplateName(t.name);
    setFileName(t.fileName);
    setFileData(t.fileData);
    setPlaceholders(t.placeholders);

    // Restore mappings, preserving existing ones and adding unmapped placeholders
    const existingMap = new Map(t.mappings.map((m) => [m.placeholder, m.variable]));
    setMappings(
      t.placeholders.map((p) => ({
        placeholder: p,
        variable: (existingMap.get(p) || "") as CaseVariable,
      }))
    );
    setStep("uploaded");
  }

  async function handleDeleteTemplate(id: string) {
    await deleteTemplate(id);
    setTemplates(await getAllTemplates());
  }

  const caseVariableOptions = Object.entries(CASE_VARIABLE_LABELS) as [CaseVariable, string][];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Template Library</h1>
          <p className="text-muted text-sm mt-1">Upload and configure document templates</p>
        </div>
        {step === "idle" && (
          <button
            onClick={() => {
              resetUpload();
              setStep("idle");
              fileInputRef.current?.click();
            }}
            className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            + Upload Template
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".docx"
        onChange={handleFileSelect}
        className="hidden"
      />

      {error && (
        <div className="bg-danger/10 border border-danger/30 text-danger rounded-lg p-3 mb-6 text-sm">
          {error}
        </div>
      )}

      {/* Upload/Mapping UI */}
      {step === "uploaded" && (
        <div className="bg-surface border border-border rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">
            {editingTemplate ? "Edit Template" : "Configure Template"}
          </h2>

          <div className="mb-6">
            <label className="block text-sm font-medium text-muted mb-1">Template Name</label>
            <input
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="w-full max-w-md bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-muted mt-1">File: {fileName}</p>
          </div>

          {placeholders.length === 0 ? (
            <div className="bg-background border border-border rounded-lg p-4 mb-6">
              <p className="text-sm text-muted">
                No placeholders found. Make sure your template uses <code className="text-accent">{"{PLACEHOLDER}"}</code> syntax.
              </p>
              <p className="text-xs text-muted mt-2">
                Example: Use <code className="text-accent">{"{CASE_NAME}"}</code>, <code className="text-accent">{"{CASE_NUM}"}</code>, etc. in your .docx file.
              </p>
            </div>
          ) : (
            <>
              <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">
                Map Placeholders to Case Variables
              </h3>
              <p className="text-xs text-muted mb-4">
                Found {placeholders.length} placeholder{placeholders.length !== 1 ? "s" : ""} in your template. Assign each one to a case data field, or leave unmapped to skip.
              </p>
              <div className="space-y-3 mb-6">
                {mappings.map((m, i) => (
                  <div
                    key={m.placeholder}
                    className="flex items-center gap-4 bg-background border border-border rounded-lg p-3"
                  >
                    <code className="text-accent text-sm font-mono min-w-0 flex-shrink-0">
                      {`{${m.placeholder}}`}
                    </code>
                    <svg className="w-4 h-4 text-muted flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                    <select
                      value={m.variable}
                      onChange={(e) => updateMapping(i, e.target.value as CaseVariable | "")}
                      className="flex-1 bg-surface border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">-- Not Mapped --</option>
                      {caseVariableOptions.map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="flex gap-3 justify-end">
            <button
              onClick={resetUpload}
              className="px-4 py-2 text-sm text-muted hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            {!editingTemplate && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 text-sm border border-border text-foreground rounded-lg hover:bg-surface-hover transition-colors"
              >
                Re-upload File
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={!templateName.trim()}
              className="bg-primary hover:bg-primary-hover disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {editingTemplate ? "Save Changes" : "Save Template"}
            </button>
          </div>
        </div>
      )}

      {/* Template Library List */}
      {templates.length === 0 && step === "idle" ? (
        <div className="text-center py-20">
          <svg className="w-16 h-16 mx-auto text-border mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
          </svg>
          <p className="text-muted text-sm mb-2">No templates uploaded yet.</p>
          <p className="text-muted text-xs">
            Upload a .docx file with placeholders like <code className="text-accent">{"{CASE_NAME}"}</code> to get started.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((t) => (
            <div
              key={t.id}
              className="bg-surface border border-border rounded-xl p-5 hover:border-primary/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-foreground">{t.name}</h3>
                  <p className="text-xs text-muted mt-1">{t.fileName}</p>
                </div>
                <span className="text-xs bg-primary/15 text-primary-hover px-2 py-1 rounded-full">
                  {t.mappings.length} mapped
                </span>
              </div>
              {t.mappings.length > 0 && (
                <div className="space-y-1 mb-4">
                  {t.mappings.map((m) => (
                    <p key={m.placeholder} className="text-xs text-muted">
                      <code className="text-accent">{`{${m.placeholder}}`}</code>
                      {" → "}
                      {CASE_VARIABLE_LABELS[m.variable]}
                    </p>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => handleEditTemplate(t)}
                  className="text-xs text-muted hover:text-foreground transition-colors"
                >
                  Edit Mappings
                </button>
                <span className="text-border">|</span>
                <button
                  onClick={() => handleDeleteTemplate(t.id)}
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
