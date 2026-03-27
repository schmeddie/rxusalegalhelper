import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Case, Template, CaseTranscript, MessageNote, Exhibit, Charge } from "./types";

interface LegalHelperDB extends DBSchema {
  cases: {
    key: string;
    value: Case;
  };
  templates: {
    key: string;
    value: Template;
  };
  transcripts: {
    key: string;
    value: CaseTranscript;
    indexes: { "by-case": string };
  };
  notes: {
    key: string;
    value: MessageNote;
    indexes: { "by-transcript": string; "by-case": string };
  };
  exhibits: {
    key: string;
    value: Exhibit;
    indexes: { "by-case": string };
  };
  charges: {
    key: string;
    value: Charge;
    indexes: { "by-case": string };
  };
}

let dbPromise: Promise<IDBPDatabase<LegalHelperDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<LegalHelperDB>("legal-helper", 4, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          db.createObjectStore("cases", { keyPath: "id" });
          db.createObjectStore("templates", { keyPath: "id" });
        }
        if (oldVersion < 2) {
          const transcriptStore = db.createObjectStore("transcripts", { keyPath: "id" });
          transcriptStore.createIndex("by-case", "caseId");
          const noteStore = db.createObjectStore("notes", { keyPath: "id" });
          noteStore.createIndex("by-transcript", "transcriptId");
          noteStore.createIndex("by-case", "caseId");
        }
        if (oldVersion < 3) {
          const exhibitStore = db.createObjectStore("exhibits", { keyPath: "id" });
          exhibitStore.createIndex("by-case", "caseId");
        }
        if (oldVersion < 4) {
          const chargeStore = db.createObjectStore("charges", { keyPath: "id" });
          chargeStore.createIndex("by-case", "caseId");
        }
      },
    });
  }
  return dbPromise;
}

// Cases
export async function getAllCases(): Promise<Case[]> {
  const db = await getDB();
  return db.getAll("cases");
}

export async function getCase(id: string): Promise<Case | undefined> {
  const db = await getDB();
  return db.get("cases", id);
}

export async function saveCase(c: Case): Promise<void> {
  const db = await getDB();
  await db.put("cases", c);
}

export async function deleteCase(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("cases", id);
}

// Templates
export async function getAllTemplates(): Promise<Template[]> {
  const db = await getDB();
  return db.getAll("templates");
}

export async function getTemplate(id: string): Promise<Template | undefined> {
  const db = await getDB();
  return db.get("templates", id);
}

export async function saveTemplate(t: Template): Promise<void> {
  const db = await getDB();
  await db.put("templates", t);
}

export async function deleteTemplate(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("templates", id);
}

// Transcripts
export async function getTranscriptsForCase(caseId: string): Promise<CaseTranscript[]> {
  const db = await getDB();
  return db.getAllFromIndex("transcripts", "by-case", caseId);
}

export async function getTranscript(id: string): Promise<CaseTranscript | undefined> {
  const db = await getDB();
  return db.get("transcripts", id);
}

export async function saveTranscript(t: CaseTranscript): Promise<void> {
  const db = await getDB();
  await db.put("transcripts", t);
}

export async function deleteTranscript(id: string): Promise<void> {
  const db = await getDB();
  // Also delete associated notes
  const notes = await db.getAllFromIndex("notes", "by-transcript", id);
  const tx = db.transaction(["transcripts", "notes"], "readwrite");
  await tx.objectStore("transcripts").delete(id);
  for (const note of notes) {
    await tx.objectStore("notes").delete(note.id);
  }
  await tx.done;
}

// Notes
export async function getNotesForTranscript(transcriptId: string): Promise<MessageNote[]> {
  const db = await getDB();
  return db.getAllFromIndex("notes", "by-transcript", transcriptId);
}

export async function saveNote(n: MessageNote): Promise<void> {
  const db = await getDB();
  await db.put("notes", n);
}

export async function deleteNote(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("notes", id);
}

// Exhibits
export async function getExhibitsForCase(caseId: string): Promise<Exhibit[]> {
  const db = await getDB();
  const exhibits = await db.getAllFromIndex("exhibits", "by-case", caseId);
  return exhibits.sort((a, b) => a.exhibitNumber - b.exhibitNumber);
}

export async function saveExhibit(e: Exhibit): Promise<void> {
  const db = await getDB();
  await db.put("exhibits", e);
}

export async function deleteExhibit(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("exhibits", id);
}

// Charges
export async function getChargesForCase(caseId: string): Promise<Charge[]> {
  const db = await getDB();
  const charges = await db.getAllFromIndex("charges", "by-case", caseId);
  return charges.sort((a, b) => a.countNumber - b.countNumber);
}

export async function saveCharge(c: Charge): Promise<void> {
  const db = await getDB();
  await db.put("charges", c);
}

export async function deleteCharge(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("charges", id);
}
