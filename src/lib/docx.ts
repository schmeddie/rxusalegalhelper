import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import { saveAs } from "file-saver";
import type { Case, PlaceholderMapping, CaseVariable } from "./types";

/**
 * Parse a .docx file and extract placeholders matching the pattern {PLACEHOLDER}
 */
export function extractPlaceholders(fileData: ArrayBuffer): string[] {
  const zip = new PizZip(fileData);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: "{", end: "}" },
  });

  const text = doc.getFullText();
  const regex = /\{([^}]+)\}/g;
  const placeholders = new Set<string>();
  let match;
  while ((match = regex.exec(text)) !== null) {
    placeholders.add(match[1]);
  }
  return Array.from(placeholders);
}

/**
 * Generate a filled .docx from a template and case data
 */
export function generateDocument(
  fileData: ArrayBuffer,
  caseData: Case,
  mappings: PlaceholderMapping[]
): void {
  const zip = new PizZip(fileData);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: "{", end: "}" },
  });

  const data: Record<string, string> = {};
  for (const mapping of mappings) {
    const variable = mapping.variable as CaseVariable;
    if (variable === "currentDate") {
      data[mapping.placeholder] = new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } else {
      data[mapping.placeholder] = caseData[variable] || "";
    }
  }

  doc.render(data);

  const out = doc.getZip().generate({
    type: "blob",
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });

  const fileName = `${caseData.caseName.replace(/\s+/g, "_")}_document.docx`;
  saveAs(out, fileName);
}
