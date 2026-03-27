"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getCase } from "@/lib/db";
import { getAllTemplates } from "@/lib/db";
import { generateDocument } from "@/lib/docx";
import type { Case, Template } from "@/lib/types";
import Link from "next/link";

export default function CaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  useEffect(() => {
    const id = params.id as string;
    getCase(id).then((c) => {
      if (!c) {
        router.push("/cases");
        return;
      }
      setCaseData(c);
    });
    getAllTemplates().then(setTemplates);
  }, [params.id, router]);

  function handleGenerate(template: Template) {
    if (!caseData) return;
    generateDocument(template.fileData, caseData, template.mappings);
    setShowTemplateModal(false);
  }

  if (!caseData) {
    return <div className="text-muted">Loading...</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/cases" className="text-sm text-muted hover:text-foreground transition-colors">
          &larr; Back to Cases
        </Link>
      </div>

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">{caseData.caseName}</h1>
          <p className="text-muted text-sm mt-1">Case #{caseData.caseNumber}</p>
        </div>
        <button
          onClick={() => setShowTemplateModal(true)}
          className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + Add Document
        </button>
      </div>

      {/* Case Details */}
      <div className="bg-surface border border-border rounded-xl p-6 mb-8">
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4">Case Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { label: "Case Name", value: caseData.caseName },
            { label: "Case Number", value: caseData.caseNumber },
            { label: "Assigned Judge", value: caseData.assignedJudge },
            { label: "Defendant", value: caseData.defendantName },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-xs text-muted mb-1">{label}</p>
              <p className="text-foreground font-medium">{value}</p>
            </div>
          ))}
          <div className="md:col-span-2">
            <p className="text-xs text-muted mb-1">Charges</p>
            <p className="text-foreground font-medium">{caseData.charges}</p>
          </div>
        </div>
      </div>

      {/* Quick Generate Info */}
      <div className="bg-surface border border-border rounded-xl p-6">
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4">Document Generation</h2>
        {templates.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted text-sm mb-2">No templates uploaded yet.</p>
            <Link href="/templates" className="text-primary hover:text-primary-hover text-sm font-medium transition-colors">
              Go to Template Library &rarr;
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-muted mb-3">
              Click &quot;+ Add Document&quot; above to generate a pre-filled document from one of your {templates.length} template{templates.length !== 1 ? "s" : ""}.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {templates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleGenerate(t)}
                  className="bg-background border border-border rounded-lg p-3 text-left hover:border-primary/50 transition-colors group"
                >
                  <p className="text-sm font-medium text-foreground group-hover:text-primary-hover transition-colors truncate">
                    {t.name}
                  </p>
                  <p className="text-xs text-muted mt-1">{t.mappings.length} mapped field{t.mappings.length !== 1 ? "s" : ""}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Template Selection Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface border border-border rounded-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Select Template</h2>
            {templates.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-muted text-sm mb-3">No templates available.</p>
                <Link
                  href="/templates"
                  className="text-primary hover:text-primary-hover text-sm font-medium"
                >
                  Upload a template &rarr;
                </Link>
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {templates.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => handleGenerate(t)}
                    className="w-full bg-background border border-border rounded-lg p-4 text-left hover:border-primary/50 transition-colors group"
                  >
                    <p className="font-medium text-foreground group-hover:text-primary-hover transition-colors">
                      {t.name}
                    </p>
                    <p className="text-xs text-muted mt-1">
                      {t.fileName} &middot; {t.mappings.length} mapped field{t.mappings.length !== 1 ? "s" : ""}
                    </p>
                  </button>
                ))}
              </div>
            )}
            <div className="flex justify-end pt-4">
              <button
                onClick={() => setShowTemplateModal(false)}
                className="px-4 py-2 text-sm text-muted hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
