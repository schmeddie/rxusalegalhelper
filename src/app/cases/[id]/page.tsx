"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { getCase, getAllTemplates, getTranscriptsForCase, saveTranscript, deleteTranscript, getExhibitsForCase } from "@/lib/db";
import { generateDocument } from "@/lib/docx";
import type { Case, Template, CaseTranscript, Exhibit } from "@/lib/types";
import Link from "next/link";
import TranscriptViewer from "@/components/TranscriptViewer";
import EvidenceManager from "@/components/EvidenceManager";

export default function CaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [transcripts, setTranscripts] = useState<CaseTranscript[]>([]);
  const [activeTranscript, setActiveTranscript] = useState<CaseTranscript | null>(null);
  const [exhibits, setExhibits] = useState<Exhibit[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    getTranscriptsForCase(params.id as string).then(setTranscripts);
    getExhibitsForCase(params.id as string).then(setExhibits);
  }, [params.id, router]);

  // Refresh exhibits when EvidenceManager changes them
  function refreshExhibits() {
    getExhibitsForCase(params.id as string).then(setExhibits);
  }

  async function handleGenerate(template: Template) {
    if (!caseData) return;
    // Fetch latest exhibits for evidence placeholder
    const latestExhibits = await getExhibitsForCase(caseData.id);
    generateDocument(template.fileData, caseData, template.mappings, latestExhibits);
    setShowTemplateModal(false);
  }

  function handleTranscriptUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !caseData) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const text = reader.result as string;
      const transcript: CaseTranscript = {
        id: uuidv4(),
        caseId: caseData.id,
        fileName: file.name,
        rawText: text,
        createdAt: new Date().toISOString(),
      };
      await saveTranscript(transcript);
      const updated = await getTranscriptsForCase(caseData.id);
      setTranscripts(updated);
      setActiveTranscript(transcript);
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleDeleteTranscript(id: string) {
    await deleteTranscript(id);
    if (activeTranscript?.id === id) setActiveTranscript(null);
    if (caseData) setTranscripts(await getTranscriptsForCase(caseData.id));
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
        <div className="flex gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="border border-border hover:border-primary/50 text-foreground px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Upload Transcript
          </button>
          <button
            onClick={() => setShowTemplateModal(true)}
            className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            + Add Document
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".txt"
        onChange={handleTranscriptUpload}
        className="hidden"
      />

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
            <div className="flex flex-wrap gap-1.5">
              {caseData.charges.split(";").filter(Boolean).map((charge) => (
                <span
                  key={charge.trim()}
                  className="inline-block bg-primary/15 text-primary-hover text-xs px-2 py-1 rounded-md"
                >
                  {charge.trim()}
                </span>
              ))}
              {!caseData.charges && <p className="text-foreground font-medium">None</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Evidence / Exhibits */}
      <div className="bg-surface border border-border rounded-xl p-6 mb-8">
        <EvidenceManager caseId={caseData.id} onUpdate={refreshExhibits} />
      </div>

      {/* Case Transcripts */}
      <div className="bg-surface border border-border rounded-xl p-6 mb-8">
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4">
          Case Transcripts
        </h2>

        {transcripts.length === 0 && !activeTranscript ? (
          <div className="text-center py-8">
            <svg className="w-12 h-12 mx-auto text-border mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <p className="text-muted text-sm mb-2">No transcripts uploaded.</p>
            <p className="text-muted text-xs">
              Upload a Discord channel export (.txt) to view and annotate the case proceedings.
            </p>
          </div>
        ) : (
          <>
            {/* Transcript tabs */}
            {transcripts.length > 0 && (
              <div className="flex gap-2 mb-4 flex-wrap">
                {transcripts.map((t) => (
                  <div key={t.id} className="flex items-center gap-1">
                    <button
                      onClick={() => setActiveTranscript(activeTranscript?.id === t.id ? null : t)}
                      className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${
                        activeTranscript?.id === t.id
                          ? "bg-primary/15 text-primary-hover border border-primary/30"
                          : "bg-background border border-border text-muted hover:text-foreground"
                      }`}
                    >
                      {t.fileName}
                    </button>
                    <button
                      onClick={() => handleDeleteTranscript(t.id)}
                      className="text-xs text-danger hover:text-danger-hover transition-colors p-1"
                      title="Delete transcript"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Active transcript viewer */}
            {activeTranscript && (
              <TranscriptViewer transcript={activeTranscript} caseId={caseData.id} />
            )}
          </>
        )}
      </div>

      {/* Document Generation */}
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
