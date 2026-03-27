import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Case, Template, CaseTranscript, MessageNote, Exhibit, Charge, Witness, ActivityEntry } from "./types";

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
  witnesses: {
    key: string;
    value: Witness;
    indexes: { "by-case": string };
  };
  activity: {
    key: string;
    value: ActivityEntry;
    indexes: { "by-case": string };
  };
}

let dbPromise: Promise<IDBPDatabase<LegalHelperDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<LegalHelperDB>("legal-helper", 5, {
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
        if (oldVersion < 5) {
          const witnessStore = db.createObjectStore("witnesses", { keyPath: "id" });
          witnessStore.createIndex("by-case", "caseId");
          const activityStore = db.createObjectStore("activity", { keyPath: "id" });
          activityStore.createIndex("by-case", "caseId");
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

// Witnesses
export async function getWitnessesForCase(caseId: string): Promise<Witness[]> {
  const db = await getDB();
  const witnesses = await db.getAllFromIndex("witnesses", "by-case", caseId);
  return witnesses.sort((a, b) => a.witnessNumber - b.witnessNumber);
}

export async function saveWitness(w: Witness): Promise<void> {
  const db = await getDB();
  await db.put("witnesses", w);
}

export async function deleteWitness(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("witnesses", id);
}

// Activity Log
export async function getActivityForCase(caseId: string): Promise<ActivityEntry[]> {
  const db = await getDB();
  const entries = await db.getAllFromIndex("activity", "by-case", caseId);
  return entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function saveActivity(a: ActivityEntry): Promise<void> {
  const db = await getDB();
  await db.put("activity", a);
}

export async function deleteActivity(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("activity", id);
}

// Export all data
export async function exportAllData(): Promise<string> {
  const db = await getDB();
  const data = {
    cases: await db.getAll("cases"),
    templates: (await db.getAll("templates")).map((t) => ({
      ...t,
      fileData: Array.from(new Uint8Array(t.fileData)),
    })),
    transcripts: await db.getAll("transcripts"),
    notes: await db.getAll("notes"),
    exhibits: await db.getAll("exhibits"),
    charges: await db.getAll("charges"),
    witnesses: await db.getAll("witnesses"),
    activity: await db.getAll("activity"),
    exportedAt: new Date().toISOString(),
    version: 5,
  };
  return JSON.stringify(data, null, 2);
}

// Import data (merges with existing)
export async function importData(jsonStr: string): Promise<{ imported: number }> {
  const data = JSON.parse(jsonStr);
  const db = await getDB();
  let count = 0;

  const tx = db.transaction(
    ["cases", "templates", "transcripts", "notes", "exhibits", "charges", "witnesses", "activity"],
    "readwrite"
  );

  for (const c of data.cases || []) {
    if (!c.status) c.status = "Pre-Filing";
    await tx.objectStore("cases").put(c);
    count++;
  }
  for (const t of data.templates || []) {
    if (Array.isArray(t.fileData)) {
      t.fileData = new Uint8Array(t.fileData).buffer;
    }
    await tx.objectStore("templates").put(t);
    count++;
  }
  for (const t of data.transcripts || []) { await tx.objectStore("transcripts").put(t); count++; }
  for (const n of data.notes || []) { await tx.objectStore("notes").put(n); count++; }
  for (const e of data.exhibits || []) { await tx.objectStore("exhibits").put(e); count++; }
  for (const c of data.charges || []) { await tx.objectStore("charges").put(c); count++; }
  for (const w of data.witnesses || []) { await tx.objectStore("witnesses").put(w); count++; }
  for (const a of data.activity || []) { await tx.objectStore("activity").put(a); count++; }

  await tx.done;
  return { imported: count };
}
