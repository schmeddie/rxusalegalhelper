"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { getCase, saveCase, getAllTemplates, getTranscriptsForCase, saveTranscript, deleteTranscript, getExhibitsForCase, getChargesForCase, getWitnessesForCase, saveActivity, getActivityForCase } from "@/lib/db";
import { generateDocument } from "@/lib/docx";
import type { Case, Template, CaseTranscript, Exhibit, Charge, Witness, CaseStatus, ActivityEntry } from "@/lib/types";
import { CASE_STATUSES, CASE_STATUS_COLORS } from "@/lib/types";
import Link from "next/link";
import TranscriptViewer from "@/components/TranscriptViewer";
import EvidenceManager from "@/components/EvidenceManager";
import ChargesManager from "@/components/ChargesManager";
import WitnessManager from "@/components/WitnessManager";
import ActivityTimeline from "@/components/ActivityTimeline";

export default function CaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [transcripts, setTranscripts] = useState<CaseTranscript[]>([]);
  const [activeTranscript, setActiveTranscript] = useState<CaseTranscript | null>(null);
  const [exhibits, setExhibits] = useState<Exhibit[]>([]);
  const [charges, setCharges] = useState<Charge[]>([]);
  const [witnesses, setWitnesses] = useState<Witness[]>([]);
  const [activityKey, setActivityKey] = useState(0);
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
    getChargesForCase(params.id as string).then(setCharges);
    getWitnessesForCase(params.id as string).then(setWitnesses);
  }, [params.id, router]);

  function refreshExhibits() {
    getExhibitsForCase(params.id as string).then(setExhibits);
  }

  function refreshCharges() {
    getChargesForCase(params.id as string).then(setCharges);
  }

  function refreshWitnesses() {
    getWitnessesForCase(params.id as string).then(setWitnesses);
  }

  async function logActivity(action: string, detail: string) {
    const entry: ActivityEntry = {
      id: uuidv4(),
      caseId: params.id as string,
      type: "auto",
      action,
      detail,
      createdAt: new Date().toISOString(),
    };
    await saveActivity(entry);
    setActivityKey(k => k + 1);
  }

  async function handleStatusChange(newStatus: CaseStatus) {
    if (!caseData || caseData.status === newStatus) return;
    const oldStatus = caseData.status;
    const updated = { ...caseData, status: newStatus, updatedAt: new Date().toISOString() };
    await saveCase(updated);
    setCaseData(updated);
    await logActivity("Status Changed", `${oldStatus} \u2192 ${newStatus}`);
  }

  async function handleGenerate(template: Template) {
    if (!caseData) return;
    const [latestExhibits, latestCharges, latestWitnesses] = await Promise.all([
      getExhibitsForCase(caseData.id),
      getChargesForCase(caseData.id),
      getWitnessesForCase(caseData.id),
    ]);
    generateDocument(template.fileData, caseData, template.mappings, latestExhibits, latestCharges, latestWitnesses);
    setShowTemplateModal(false);
    await logActivity("Document Generated", `Generated "${template.name}" document`);
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
      await logActivity("Transcript Uploaded", `Uploaded "${file.name}"`);
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
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{caseData.caseName}</h1>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${CASE_STATUS_COLORS[caseData.status] || "bg-zinc-500/15 text-zinc-400"}`}>
              {caseData.status}
            </span>
          </div>
          <p className="text-muted text-sm mt-1">Case #{caseData.caseNumber}</p>
          {/* Status Changer */}
          <div className="flex gap-1.5 mt-3 flex-wrap">
            {CASE_STATUSES.map((status) => (
              <button
                key={status}
                onClick={() => handleStatusChange(status)}
                className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                  caseData.status === status
                    ? `${CASE_STATUS_COLORS[status]} border-current`
                    : "border-border text-muted hover:text-foreground"
                }`}
              >
                {status}
              </button>
            ))}
          </div>
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
        </div>
      </div>

      {/* Charges */}
      <div className="bg-surface border border-border rounded-xl p-6 mb-8">
        <ChargesManager caseId={caseData.id} onUpdate={refreshCharges} />
      </div>

      {/* Evidence / Exhibits */}
      <div className="bg-surface border border-border rounded-xl p-6 mb-8">
        <EvidenceManager caseId={caseData.id} onUpdate={refreshExhibits} />
      </div>

      {/* Witnesses */}
      <div className="bg-surface border border-border rounded-xl p-6 mb-8">
        <WitnessManager caseId={caseData.id} onUpdate={refreshWitnesses} />
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

      {/* Activity Timeline */}
      <div className="bg-surface border border-border rounded-xl p-6 mb-8">
        <ActivityTimeline key={activityKey} caseId={caseData.id} />
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
