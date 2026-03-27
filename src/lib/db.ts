import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Case, Template } from "./types";

interface LegalHelperDB extends DBSchema {
  cases: {
    key: string;
    value: Case;
  };
  templates: {
    key: string;
    value: Template;
  };
}

let dbPromise: Promise<IDBPDatabase<LegalHelperDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<LegalHelperDB>("legal-helper", 1, {
      upgrade(db) {
        db.createObjectStore("cases", { keyPath: "id" });
        db.createObjectStore("templates", { keyPath: "id" });
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
